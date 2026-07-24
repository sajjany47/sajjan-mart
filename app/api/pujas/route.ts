import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const active = searchParams.get('active');

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

    const items = await prisma.puja.findMany({
      where,
      include: { items: true, pandits: { include: { pandit: true } } },
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
    const item = await prisma.puja.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
