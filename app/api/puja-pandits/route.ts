import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pujaId = searchParams.get('pujaId');
    const panditId = searchParams.get('panditId');

    const where: Record<string, unknown> = {};
    if (pujaId) where.pujaId = pujaId;
    if (panditId) where.panditId = panditId;

    const items = await prisma.pujaPandit.findMany({
      where,
      include: { puja: true, pandit: true },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const item = await prisma.pujaPandit.create({ data: body });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
