import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyToken } from '@/lib/jwt';
import { jsonResponse } from '@/lib/api-utils';
import { sendCancelRequestMail } from '@/lib/mailer';

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing', 'packed'];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedItemIds: string[] = Array.isArray(body.item_ids) ? body.item_ids : [];

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.userId !== payload.id) {
      return NextResponse.json({ error: 'You can only cancel your own orders' }, { status: 403 });
    }
    if (order.status === 'cancel_request') {
      return NextResponse.json({ error: 'A cancellation request is already pending for this order.' }, { status: 400 });
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: `This order cannot be cancelled (current status: ${order.status}).` },
        { status: 400 }
      );
    }

    // If no items were selected, the user wants to cancel the entire order.
    let itemIdsToCancel: string[] = requestedItemIds;
    if (itemIdsToCancel.length === 0) {
      itemIdsToCancel = order.items.map((i) => i.id);
    } else {
      const validIds = new Set(order.items.map((i) => i.id));
      itemIdsToCancel = itemIdsToCancel.filter((id) => validIds.has(id));
      if (itemIdsToCancel.length === 0) {
        return NextResponse.json({ error: 'No valid items selected for cancellation.' }, { status: 400 });
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancel_request',
        cancelRequestedAt: new Date(),
        cancelRequestItems: itemIdsToCancel,
        previousStatus: order.status,
      },
    });

    // Notify admin about the cancellation request (never blocks the response)
    const requestedNames = order.items
      .filter((i) => itemIdsToCancel.includes(i.id))
      .map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`);
    prisma.order
      .findUnique({ where: { id: order.id }, include: { items: true, user: true } })
      .then((full) => full && sendCancelRequestMail(full, requestedNames))
      .catch((e) => console.error('[orders] cancel-request-mail failed:', e));

    return jsonResponse(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
