import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const active = searchParams.get('active');
    const sort = searchParams.get('sort') ?? 'newest';

    if (slug) {
      const item = await prisma.puja.findUnique({
        where: { slug },
        include: { items: true, pandits: { include: { pandit: true } } },
      });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return jsonResponse(item);
    }

    const where: Record<string, unknown> = {};
    if (active === 'true') where.isActive = true;

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price-asc') orderBy = { basePrice: 'asc' };
    else if (sort === 'price-desc') orderBy = { basePrice: 'desc' };
    else if (sort === 'newest' || sort === 'created_at') orderBy = { createdAt: 'desc' };
    else if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const items = await prisma.puja.findMany({
      where,
      include: { items: true, pandits: { include: { pandit: true } } },
      orderBy,
    });

    const hasImage = (p: any) => p.image_url && p.image_url.trim().length > 0;
    const lcName = (p: any) => (p.name ?? '').toLowerCase();

    if (sort === 'name-asc' || sort === 'name') {
      items.sort((a, b) => lcName(a).localeCompare(lcName(b)));
    } else if (sort === 'name-desc') {
      items.sort((a, b) => lcName(b).localeCompare(lcName(a)));
    } else if (sort === 'image-missing') {
      items.sort((a, b) => (hasImage(a) ? 1 : 0) - (hasImage(b) ? 1 : 0));
    }

    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.puja.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
