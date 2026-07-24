import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const item = await prisma.category.findUnique({
        where: { slug },
        include: { subCategories: true },
      });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    }

    const items = await prisma.category.findMany({
      include: { subCategories: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await prisma.category.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
