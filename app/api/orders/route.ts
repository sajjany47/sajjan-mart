import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { getStoreConfig, isFoodOpenNow } from '@/lib/store-config';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') ?? searchParams.get('user_id');
    const orderId = searchParams.get('id');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (orderId) where.id = orderId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const items = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, role: true, avatarUrl: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const orders = items.map(({ items: orderItems, ...order }) => ({
      ...order,
      order_items: orderItems,
    }));
    return jsonResponse(orders);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { hasFood, ...orderData } = await parseBody(request);

    if (hasFood) {
      const config = await getStoreConfig();
      if (!isFoodOpenNow(config)) {
        return NextResponse.json(
          { error: 'The Food section is currently closed. Please try again during opening hours.' },
          { status: 400 }
        );
      }
    }

    const item = await prisma.order.create({ data: orderData });
    return jsonResponse(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
