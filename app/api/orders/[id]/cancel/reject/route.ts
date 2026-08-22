import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { jsonResponse } from '@/lib/api-utils';
import { sendCancelRejectedMail } from '@/lib/mailer';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const rejectItemIds: string[] = Array.isArray(body.item_ids) ? body.item_ids : [];

    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.status !== 'cancel_request') {
      return NextResponse.json(
        { error: 'This order has no pending cancellation request.' },
        { status: 400 }
      );
    }

    const requested = Array.isArray(order.cancelRequestItems)
      ? order.cancelRequestItems.map((r) => String(r))
      : [];

    // If specific items are being rejected, remove only those from the pending
    // request and keep the rest open. Otherwise reject the entire request.
    const remainingRequested =
      rejectItemIds.length > 0
        ? requested.filter((id) => !rejectItemIds.includes(id))
        : [];

    let data: Record<string, unknown>;
    if (remainingRequested.length > 0) {
      data = {
        status: 'cancel_request',
        cancelRequestItems: remainingRequested,
      };
    } else {
      data = {
        status: order.previousStatus ?? 'confirmed',
        cancelRequestedAt: null,
        cancelReason: null,
        cancelRequestItems: Prisma.DbNull,
        previousStatus: null,
      };
    }

    const updated = await prisma.order.update({ where: { id: order.id }, data: data as any });

    // Notify the customer that the request was declined (never blocks the response)
    if (remainingRequested.length === 0) {
      prisma.order
        .findUnique({ where: { id: order.id }, include: { items: true, user: true } })
        .then((full) => full && sendCancelRejectedMail(full))
        .catch((e) => console.error('[orders] cancel-rejected-mail failed:', e));
    }

    return jsonResponse(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reject cancellation' }, { status: 500 });
  }
}
