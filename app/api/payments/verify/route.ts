import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { verifyPaymentSignature, fetchRazorpayPayment, razorpayConfigured } from '@/lib/razorpay';
import { sendPaymentSuccessMail } from '@/lib/mailer';

/**
 * Server-side verification of the Checkout response.
 *
 * Security gate: the HMAC signature over `order_id|payment_id` is verified
 * with the secret BEFORE an order is ever marked paid. Replays of the same
 * signature are idempotent — an already-paid order returns success again.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const orderId = String(body.orderId ?? '');
    const razorpayOrderId = String(body.razorpayOrderId ?? '');
    const razorpayPaymentId = String(body.razorpayPaymentId ?? '');
    const razorpaySignature = String(body.razorpaySignature ?? '');

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment verification fields.' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: true } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // The order must actually reference this Razorpay order.
    if (order.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json({ error: 'Payment order mismatch.' }, { status: 400 });
    }

    // Idempotent replay: same payment already verified -> success.
    if (order.paymentStatus === 'paid' && order.razorpayPaymentId === razorpayPaymentId) {
      return jsonResponse(order);
    }

    // The real gate — cryptographic signature check.
    const ok = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!ok) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'failed', paymentFailureReason: 'Signature verification failed.' },
      });
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    // Belt-and-braces: confirm with Razorpay that the payment was captured.
    // (skipped when keys are not configured, e.g. a signature-check test env)
    if (razorpayConfigured()) {
      try {
        const payment = await fetchRazorpayPayment(razorpayPaymentId);
        if (payment.status !== 'captured') {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'failed', razorpayPaymentId, paymentFailureReason: payment.error_description ?? `Payment not captured (${payment.status}).` },
          });
          return NextResponse.json({ error: `Payment not captured (${payment.status}).` }, { status: 400 });
        }
      } catch (error) {
        console.error('[payments] failed to fetch razorpay payment:', error);
        return NextResponse.json({ error: 'Could not confirm payment status. Please retry.' }, { status: 502 });
      }
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'paid',
        razorpayPaymentId,
        razorpaySignature,
        paidAt: new Date(),
        paymentFailureReason: null,
      },
    });

    if (order.user?.email) {
      prisma.order
        .findUnique({ where: { id: updated.id }, include: { items: true, user: true } })
        .then((full) => full && sendPaymentSuccessMail(full))
        .catch((e) => console.error('[payments] success-mail failed:', e));
    }

    return jsonResponse(updated);
  } catch (error) {
    console.error('[payments] verify failed:', error);
    return NextResponse.json({ error: 'Failed to verify payment.' }, { status: 500 });
  }
}