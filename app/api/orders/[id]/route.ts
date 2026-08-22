import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin-auth';
import { computeOrderAmounts, buildRefundUpdate } from '@/lib/order-refunds';
import { sendOrderStatusMail, sendAdminItemCancelledMail } from '@/lib/mailer';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'packed'];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.order.findUnique({
      where: { id: params.id },
      include: { user: true, items: true },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return jsonResponse({ ...item, amounts: computeOrderAmounts(item) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;
  try {
    const body = await parseBody(request);
    const before = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    // Admin directly cancels a whole active order (e.g. Reject on a new order):
    // run the same central settlement as item cancellation — every item is
    // cancelled and the full amount the customer actually paid is refunded.
    if (
      body.status === 'cancelled' &&
      before &&
      ACTIVE_STATUSES.includes(before.status)
    ) {
      const full = await prisma.order.findUnique({
        where: { id: params.id },
        include: { items: true },
      });
      if (full) {
        const openItemIds = full.items.filter((i) => !i.cancelled).map((i) => i.id);
        const wasPaid = full.paymentStatus === 'paid';
        // Treat all items as cancelled so the central rules compute a full
        // refund (original total − 0) capped at what was actually paid.
        const settlement = buildRefundUpdate({
          ...full,
          orderNumber: full.orderNumber,
          items: full.items.map((i) => ({ ...i, cancelled: true })),
        });

        await prisma.$transaction([
          ...(openItemIds.length > 0
            ? [
                prisma.orderItem.updateMany({
                  where: { id: { in: openItemIds } },
                  data: { cancelled: true, refunded: wasPaid },
                }),
              ]
            : []),
          prisma.order.update({ where: { id: params.id }, data: { ...body, ...settlement } }),
        ]);

        const updated = await prisma.order.findUnique({
          where: { id: params.id },
          include: { items: true, user: true },
        });

        // Notify the customer with the cancellation details (never blocks).
        if (updated) {
          const names = updated.items
            .filter((i) => i.cancelled)
            .map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`);
          sendAdminItemCancelledMail(updated, names, computeOrderAmounts(updated)).catch((e) =>
            console.error('[orders] cancel-mail failed:', e)
          );
        }

        return jsonResponse({
          ...(updated ?? {}),
          amounts: updated ? computeOrderAmounts(updated) : null,
        });
      }
    }

    const item = await prisma.order.update({ where: { id: params.id }, data: body });

    // Notify the customer whenever the status changes (never blocks the response)
    const newStatus = typeof body.status === 'string' ? body.status : null;
    if (newStatus && before && before.status !== newStatus) {
      prisma.order
        .findUnique({ where: { id: params.id }, include: { items: true, user: true } })
        .then((full) => full && sendOrderStatusMail(full, newStatus))
        .catch((e) => console.error('[orders] status-mail failed:', e));
    }

    return jsonResponse(item);
  } catch (error) {
    console.error('[orders] update failed:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.order.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
