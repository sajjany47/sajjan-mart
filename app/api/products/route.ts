import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse } from '@/lib/api-utils';

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
    const subCategoryId = searchParams.get('subCategoryId');
    const brandId = searchParams.get('brandId');

    if (slug) {
      const item = await prisma.product.findUnique({
        where: { slug },
        include: { productImages: true, variants: true, category: true, subCategory: true, brand: true },
      });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return jsonResponse(item);
    }

    const where: Record<string, unknown> = {};

    if (active === 'true') where.isActive = true;
    if (featured === 'true') where.isFeatured = true;
    if (bestSeller === 'true') where.isBestSeller = true;
    if (popular === 'true') where.isPopular = true;
    if (todayDeal === 'true') where.isTodayDeal = true;
    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (brandId) where.brandId = brandId;

    const items = await prisma.product.findMany({
      where,
      include: { productImages: true, variants: true, category: true, subCategory: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await prisma.product.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
