import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const code = searchParams.get('code');

    if (code) {
      const item = await prisma.coupon.findUnique({ where: { code } });
      if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(item);
    }

    const where: Record<string, unknown> = {};
    if (active === 'true') where.isActive = true;

    const items = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await prisma.coupon.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
