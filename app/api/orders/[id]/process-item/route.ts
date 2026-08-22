import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { jsonResponse } from '@/lib/api-utils';
import { computeOrderAmounts, buildRefundUpdate } from '@/lib/order-refunds';
import { sendAdminItemCancelledMail } from '@/lib/mailer';

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
    // Idempotency guard: an already-cancelled/ready item can never be
    // cancelled (and therefore refunded) a second time.
    if (item.cancelled || item.ready) {
      return NextResponse.json(
        { error: 'This item has already been processed.' },
        { status: 400 }
      );
    }

    if (action === 'ready') {
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { ready: true, cancelled: false, refunded: false },
      });

      const fresh = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      if (!fresh) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const allHandled =
        fresh.items.length > 0 && fresh.items.every((i) => i.ready || i.cancelled);

      const orderUpdate: Record<string, unknown> = {};
      // Dispatch once everything is handled — but only when at least one
      // active item remains. An order whose items are all cancelled must
      // never be marked shipped (it will already be 'cancelled').
      if (allHandled && fresh.items.some((i) => !i.cancelled)) {
        orderUpdate.status = 'shipped';
      }

      if (Object.keys(orderUpdate).length > 0) {
        await prisma.order.update({ where: { id: order.id }, data: orderUpdate as any });
      }

      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });
      return jsonResponse(updated);
    }

    // ---- Admin cancels this item ----
    const wasPaid = order.paymentStatus === 'paid';

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { ready: false, cancelled: true, refunded: wasPaid },
    });

    // Re-fetch with the cancellation applied, then run the central
    // settlement rules (updated total / refund / collection amount).
    const fresh = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    if (!fresh) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderUpdate = buildRefundUpdate(fresh);
    if (Object.keys(orderUpdate).length > 0) {
      await prisma.order.update({ where: { id: order.id }, data: orderUpdate as any });
    }

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, user: true },
    });

    // Notify the customer immediately (never blocks the response).
    if (updated) {
      const itemName = `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`;
      sendAdminItemCancelledMail(updated, [itemName], computeOrderAmounts(updated)).catch((e) =>
        console.error('[orders] item-cancelled-mail failed:', e)
      );
    }

    const amounts = updated ? computeOrderAmounts(updated) : null;
    return jsonResponse({ ...(updated ?? {}), amounts });
  } catch (error) {
    console.error('[orders] process-item failed:', error);
    return NextResponse.json({ error: 'Failed to process item' }, { status: 500 });
  }
}
