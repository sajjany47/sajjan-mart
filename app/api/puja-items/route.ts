import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pujaId = searchParams.get('pujaId') || searchParams.get('puja_id');
    const productId = searchParams.get('productId') || searchParams.get('product_id');
    const grouped = (searchParams.get('grouped') || searchParams.get('group_by_category')) === 'true';

    const where: Record<string, any> = {};
    if (pujaId) where.pujaId = pujaId;
    if (productId) where.productId = productId;

    const items = await prisma.pujaItem.findMany({
      where,
      distinct: productId ? ['pujaId'] : undefined,
      include: { puja: true, product: true },
      orderBy: productId ? { pujaId: 'asc' } : { sortOrder: 'asc' },
    });

    if (productId) {
      const pujas = items
        .map((i) => i.puja)
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      return jsonResponse(pujas);
    }

    if (grouped) {
      const groupedItems: Record<string, any[]> = {};
      for (const item of items) {
        const key = item.category || 'basic';
        (groupedItems[key] ||= []).push(item);
      }
      return jsonResponse({ items: groupedItems });
    }

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
