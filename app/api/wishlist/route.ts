import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const where = userId ? { userId } : {};

    const items = await prisma.wishlist.findMany({
      where,
      include: { user: true, product: { include: { productImages: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return jsonResponse(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const item = await prisma.wishlist.create({ data: body });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('user_id');
    const productId = searchParams.get('productId') || searchParams.get('product_id');

    if (!userId && !productId) {
      return NextResponse.json({ error: 'userId or productId required' }, { status: 400 });
    }

    const where: { userId?: string; productId?: string } = {};
    if (userId) where.userId = userId;
    if (productId) where.productId = productId;

    const result = await prisma.wishlist.deleteMany({ where });
    return jsonResponse({ success: true, count: result.count });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
