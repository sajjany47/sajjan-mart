import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

/**
 * Records a failed Razorpay Checkout payment. Only applied while the order is
 * still pending — a concurrent successful capture (or signature verification)
 * is never clobbered by a late failure callback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const orderId = String(body.orderId ?? '');
    const razorpayPaymentId = String(body.razorpayPaymentId ?? '');
    const failureReason = String(body.failureReason ?? '').slice(0, 500);

    if (!orderId) {
      return NextResponse.json({ error: 'Order id is required.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, paymentStatus: true } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.paymentStatus === 'paid') {
      return jsonResponse({ success: true, skipped: true });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'failed',
        ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
        ...(failureReason ? { paymentFailureReason: failureReason } : {}),
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    console.error('[payments] failed-record error:', error);
    return NextResponse.json({ error: 'Failed to record payment failure.' }, { status: 500 });
  }
}