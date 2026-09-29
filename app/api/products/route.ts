import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const active = searchParams.get('active');
    const featured = searchParams.get('featured');
    const bestSeller = searchParams.get('bestSeller');
    const popular = searchParams.get('popular');
    const todayDeal = searchParams.get('todayDeal');
    const categoryId = searchParams.get('categoryId');
    const categorySlug = searchParams.get('category') || searchParams.get('categorySlug');
    const subCategoryId = searchParams.get('subCategoryId');
    const subCategorySlug = searchParams.get('subCategorySlug');
    const brandId = searchParams.get('brandId');
    const foodType = searchParams.get('foodType') || searchParams.get('food_type');
    const productType = searchParams.get('productType') || searchParams.get('product_type');
    const productCategory = searchParams.get('productCategory') || searchParams.get('product_category');
    const minPrice = searchParams.get('minPrice') || searchParams.get('sales_price_min');
    const maxPrice = searchParams.get('maxPrice') || searchParams.get('sales_price_max');
    const minRating = searchParams.get('minRating') || searchParams.get('rating_min');
    const q = searchParams.get('q') || searchParams.get('name_like');
    const sort = searchParams.get('sort') || searchParams.get('order');
    const gender = searchParams.get('gender');
    const distinctCategories = searchParams.get('distinctCategories') === 'true';
    const paginate = searchParams.get('paginate') === 'true';
    const start = parseInt(searchParams.get('start') || '0', 10) || 0;
    const endRaw = searchParams.get('end');
    const end = endRaw ? parseInt(endRaw, 10) : null;

    const productInclude = {
      productImages: true,
      variants: true,
      category: true,
      subCategory: true,
      brand: true,
      addOnLinks: { include: { addOn: true } },
    };

    if (slug) {
      const item = await prisma.product.findUnique({
        where: { slug },
        include: productInclude,
      });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return jsonResponse(item);
    }

    const where: Record<string, any> = {};

    if (active === 'true' || active === null) {
      where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    if (featured === 'true') where.isFeatured = true;
    if (bestSeller === 'true') where.isBestSeller = true;
    if (popular === 'true') where.isPopular = true;
    if (todayDeal === 'true') where.isTodayDeal = true;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) {
      const ids = brandId.split(',').map((c) => c.trim()).filter(Boolean);
      if (ids.length === 1) {
        where.brandId = ids[0];
      } else if (ids.length > 1) {
        where.brandId = { in: ids };
      }
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    } else if (subCategorySlug) {
      where.subCategory = { slug: subCategorySlug };
    }

    if (productType) {
      where.productType = productType;
    }

    if (productCategory) {
      const cats = productCategory.split(',').map((c) => c.trim()).filter(Boolean);
      if (cats.length === 1) {
        where.productCategory = cats[0];
      } else if (cats.length > 1) {
        where.productCategory = { in: cats };
      }
    }

    if (foodType) {
      const types = foodType.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (types.length === 1) {
        where.foodType = types[0];
      } else if (types.length > 1) {
        where.foodType = { in: types };
      }
    }

    if (gender) {
      if (gender === 'all') {
        where.gender = { in: ['all'] };
      } else {
        const genderList =
          gender === 'men' || gender === 'women' ? [gender, 'all', 'men_women_both'] : [gender, 'all'];
        where.gender = { in: genderList };
      }
    }

    if (minPrice || maxPrice) {
      where.salesPrice = {};
      if (minPrice) where.salesPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.salesPrice.lte = parseFloat(maxPrice);
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    let orderBy: any = [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
    if (sort === 'price-asc') orderBy = { salesPrice: 'asc' };
    else if (sort === 'price-desc') orderBy = { salesPrice: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'newest' || sort === 'created_at') orderBy = { createdAt: 'desc' };
    else if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    // 'name-asc' / 'name-desc' / 'name' / 'image-missing' are applied with a
    // case-insensitive JS sort after fetch.

    const lcName = (p: any) => (p.name ?? '').toLowerCase();
    const imgCount = (p: any) => (p.productImages ?? []).length;

    const sortInMemory = (list: any[]) => {
      if (sort === 'name-asc' || sort === 'name' || sort === 'image-missing') {
        list.sort((a, b) => lcName(a).localeCompare(lcName(b)));
      } else if (sort === 'name-desc') {
        list.sort((a, b) => lcName(b).localeCompare(lcName(a)));
      }
      if (sort === 'image-missing') {
        list.sort((a, b) => imgCount(a) - imgCount(b));
      }
      return list;
    };

    if (paginate) {
      const total = await prisma.product.count({ where });
      const take = end !== null && end >= start ? end - start + 1 : undefined;
      const items = await prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: start,
        ...(take !== undefined ? { take } : {}),
      });
      sortInMemory(items);
      if (distinctCategories) {
        const availableCategories = await prisma.product.findMany({
          where: { ...where, isActive: true },
          select: { productCategory: true },
          distinct: ['productCategory'],
        });
        return jsonResponse({
          products: items,
          total,
          availableCategories: availableCategories
            .map((c) => c.productCategory)
            .filter(Boolean),
        });
      }
      return jsonResponse({ products: items, total });
    }

    const items = await prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
    });
    sortInMemory(items);

    if (distinctCategories) {
      const availableCategories = await prisma.product.findMany({
        where: { ...where, isActive: true },
        select: { productCategory: true },
        distinct: ['productCategory'],
      });
      return jsonResponse({
        products: items,
        availableCategories: availableCategories
          .map((c) => c.productCategory)
          .filter(Boolean),
      });
    }

    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const { addOnIds, ...data } = body;
    const item = await prisma.product.create({ data });
    if (Array.isArray(addOnIds) && addOnIds.length > 0) {
      await prisma.productAddOn.createMany({
        data: addOnIds.map((addOnId: string) => ({ productId: item.id, addOnId })),
      });
    }
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
