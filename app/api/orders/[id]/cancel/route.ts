import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyToken } from '@/lib/jwt';
import { jsonResponse } from '@/lib/api-utils';

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

    const order = await prisma.order.findUnique({ where: { id: params.id } });
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

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'cancel_request',
        cancelRequestedAt: new Date(),
        previousStatus: order.status,
      },
    });
    return jsonResponse(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
