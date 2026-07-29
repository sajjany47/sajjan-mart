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
    const minPrice = searchParams.get('minPrice') || searchParams.get('sales_price_min');
    const maxPrice = searchParams.get('maxPrice') || searchParams.get('sales_price_max');
    const minRating = searchParams.get('minRating') || searchParams.get('rating_min');
    const q = searchParams.get('q') || searchParams.get('name_like');
    const sort = searchParams.get('sort') || searchParams.get('order');

    if (slug) {
      const item = await prisma.product.findUnique({
        where: { slug },
        include: { productImages: true, variants: true, category: true, subCategory: true, brand: true },
      });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return jsonResponse(item);
    }

    const where: Record<string, any> = {};

    if (active === 'true' || active === null) {
      if (active !== 'false') where.isActive = true;
    } else if (active === 'false') {
      where.isActive = false;
    }

    if (featured === 'true') where.isFeatured = true;
    if (bestSeller === 'true') where.isBestSeller = true;
    if (popular === 'true') where.isPopular = true;
    if (todayDeal === 'true') where.isTodayDeal = true;
    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;

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

    if (foodType) {
      const types = foodType.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (types.length === 1) {
        where.foodType = types[0];
      } else if (types.length > 1) {
        where.foodType = { in: types };
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

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price-asc') orderBy = { salesPrice: 'asc' };
    else if (sort === 'price-desc') orderBy = { salesPrice: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const items = await prisma.product.findMany({
      where,
      include: { productImages: true, variants: true, category: true, subCategory: true, brand: true },
      orderBy,
    });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.product.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
