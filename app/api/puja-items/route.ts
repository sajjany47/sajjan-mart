import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pujaId = searchParams.get('pujaId') || searchParams.get('puja_id');

    const where = pujaId ? { pujaId } : {};

    const items = await prisma.pujaItem.findMany({
      where,
      include: { puja: true },
      orderBy: { sortOrder: 'asc' },
    });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.pujaItem.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pujaId = searchParams.get('pujaId') || searchParams.get('puja_id');
    const result = pujaId
      ? await prisma.pujaItem.deleteMany({ where: { pujaId } })
      : await prisma.pujaItem.deleteMany({});
    return jsonResponse({ success: true, count: result.count });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
