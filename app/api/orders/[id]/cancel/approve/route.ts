import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { jsonResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const selectedItemIds: string[] = Array.isArray(body.item_ids) ? body.item_ids : [];

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'cancel_request') {
      return NextResponse.json(
        { error: 'This order has no pending cancellation request.' },
        { status: 400 }
      );
    }

    // Decide which items to cancel: selected, or all if none selected.
    const itemsToCancel =
      selectedItemIds.length > 0
        ? order.items.filter((i) => selectedItemIds.includes(i.id))
        : order.items;

    if (itemsToCancel.length === 0) {
      return NextResponse.json({ error: 'No valid items selected for cancellation.' }, { status: 400 });
    }

    const cancelledIds = itemsToCancel.map((i) => i.id);
    const refundedAmount = itemsToCancel.reduce((sum, i) => sum + Number(i.total), 0);

    // If all items are being cancelled, cancel the whole order. Otherwise keep it alive
    // under its previous status (partial cancellation) and just refund the cancelled items.
    const cancellingAll = cancelledIds.length === order.items.length;

    await prisma.$transaction([
      prisma.orderItem.updateMany({
        where: { id: { in: cancelledIds } },
        data: { cancelled: true, refunded: true },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: cancellingAll ? 'cancelled' : order.previousStatus ?? 'confirmed',
          refundedAmount,
          cancelRequestedAt: null,
          cancelReason: null,
          previousStatus: null,
          paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus,
        },
      }),
    ]);

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    return jsonResponse(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to approve cancellation' }, { status: 500 });
  }
}
