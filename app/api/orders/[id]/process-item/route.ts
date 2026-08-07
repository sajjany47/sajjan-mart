import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { jsonResponse } from '@/lib/api-utils';

const PROCESSABLE_STATUSES = ['confirmed', 'processing', 'packed'];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const itemId = String(body.item_id ?? '');
    const action = body.action === 'cancel' ? 'cancel' : 'ready';

    if (!itemId) {
      return NextResponse.json({ error: 'Item id is required.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (!PROCESSABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: 'This order is not in processing state.' },
        { status: 400 }
      );
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }
    if (item.cancelled || item.ready) {
      return NextResponse.json(
        { error: 'This item has already been processed.' },
        { status: 400 }
      );
    }

    const itemUpdate: Record<string, unknown> =
      action === 'cancel'
        ? { ready: false, cancelled: true, refunded: true }
        : { ready: true, cancelled: false, refunded: false };

    await prisma.orderItem.update({ where: { id: itemId }, data: itemUpdate as any });

    // Re-fetch the order items to decide whether every item has been handled.
    const fresh = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    if (!fresh) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const allHandled = fresh.items.length > 0 && fresh.items.every((i) => i.ready || i.cancelled);
    const refundedAmount = fresh.items.reduce(
      (sum, i) => (i.cancelled ? sum + Number(i.total) : sum),
      0
    );

    const orderUpdate: Record<string, unknown> = { refundedAmount };

    if (allHandled) {
      // Every item is ready or cancelled — move the order to dispatch (shipped).
      orderUpdate.status = 'shipped';
    }

    await prisma.order.update({
      where: { id: order.id },
      data: orderUpdate as any,
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    return jsonResponse(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process item' }, { status: 500 });
  }
}
