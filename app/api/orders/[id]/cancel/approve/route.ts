import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

    // Decide which items to cancel: admin's selection, or fall back to the
    // items the user requested for cancellation.
    const requested = Array.isArray(order.cancelRequestItems)
      ? order.cancelRequestItems.map((r) => String(r))
      : [];
    let itemIds = selectedItemIds;
    if (itemIds.length === 0) {
      itemIds = requested;
    }
    const itemsToCancel =
      itemIds.length > 0 ? order.items.filter((i) => itemIds.includes(i.id)) : order.items;

    if (itemsToCancel.length === 0) {
      return NextResponse.json({ error: 'No valid items selected for cancellation.' }, { status: 400 });
    }

    const cancelledIds = itemsToCancel.map((i) => i.id);
    const refundedAmount = itemsToCancel.reduce((sum, i) => sum + Number(i.total), 0);

    // Items still pending after this approval.
    const remainingRequested = requested.filter((id) => !cancelledIds.includes(id));
    const allItemsHandled = order.items.every((i) => i.cancelled || cancelledIds.includes(i.id));

    const orderUpdate: Record<string, unknown> = {
      refundedAmount,
      paymentStatus: order.paymentStatus === 'paid' ? 'refunded' : order.paymentStatus,
    };

    if (remainingRequested.length > 0) {
      // Other requested items are still pending — keep the request open.
      orderUpdate.status = 'cancel_request';
      orderUpdate.cancelRequestItems = remainingRequested;
    } else {
      // Request fully resolved. If every item is now cancelled, cancel the whole
      // order; otherwise restore it under its previous status (partial cancel).
      orderUpdate.status = allItemsHandled ? 'cancelled' : order.previousStatus ?? 'confirmed';
      orderUpdate.cancelRequestItems = Prisma.DbNull;
      orderUpdate.cancelRequestedAt = null;
      orderUpdate.cancelReason = null;
      orderUpdate.previousStatus = null;
    }

    await prisma.$transaction([
      prisma.orderItem.updateMany({
        where: { id: { in: cancelledIds } },
        data: { cancelled: true, refunded: true },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: orderUpdate as any,
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
