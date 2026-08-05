import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { requireAdmin } from '@/lib/admin-auth';
import { jsonResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;

  try {
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

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: order.previousStatus ?? 'confirmed',
        cancelRequestedAt: null,
        cancelReason: null,
        previousStatus: null,
      },
    });
    return jsonResponse(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reject cancellation' }, { status: 500 });
  }
}
