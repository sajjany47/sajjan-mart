import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';

/**
 * Records a failed Razorpay Checkout payment against its payment session.
 * Because no order exists yet, nothing else happens — a failed checkout never
 * places an order. If the order somehow already exists (verify/webhook race),
 * a still-pending order is marked failed defensively.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const razorpayOrderId = String(body.razorpayOrderId ?? '');
    const razorpayPaymentId = String(body.razorpayPaymentId ?? '');
    const failureReason = String(body.failureReason ?? '').slice(0, 500);

    if (!razorpayOrderId) {
      return NextResponse.json({ error: 'Razorpay order id is required.' }, { status: 400 });
    }

    const session = await prisma.paymentSession.findUnique({ where: { razorpayOrderId } });
    if (session && session.status !== 'paid') {
      await prisma.paymentSession.update({
        where: { id: session.id },
        data: {
          status: 'failed',
          ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
        },
      });
      return jsonResponse({ success: true });
    }

    // Defensive: a pending order tied to this razorpay order (e.g. legacy rows
    // or a concurrent settle) should not stay pending after a failed payment.
    if (razorpayOrderId) {
      const order = await prisma.order.findFirst({
        where: { razorpayOrderId, paymentStatus: 'pending' },
        select: { id: true, paymentStatus: true },
      });
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'failed',
            ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
            ...(failureReason ? { paymentFailureReason: failureReason } : {}),
          },
        });
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[payments] failed-record error:', error);
    return NextResponse.json({ error: 'Failed to record payment failure.' }, { status: 500 });
  }
}