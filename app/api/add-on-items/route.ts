import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const q = searchParams.get('q') || searchParams.get('name_like');

    const where: Record<string, any> = {};
    if (active === 'true') where.isActive = true;
    else if (active === 'false') where.isActive = false;
    if (q) where.name = { contains: q, mode: 'insensitive' };

    const items = await prisma.addOnItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.addOnItem.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}