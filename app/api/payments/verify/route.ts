import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { verifyPaymentSignature, fetchRazorpayPayment, razorpayConfigured } from '@/lib/razorpay';
import { createOrderFromPaymentSession } from '@/lib/razorpay-settle';

/**
 * Server-side verification of the Checkout response.
 *
 * Security gate: the HMAC signature over `order_id|payment_id` is verified
 * with the secret BEFORE the order is created as paid. The order row itself is
 * only written here (or by the `payment.captured` webhook) — a payment that
 * fails or is dismissed never places an order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    const razorpayOrderId = String(body.razorpayOrderId ?? '');
    const razorpayPaymentId = String(body.razorpayPaymentId ?? '');
    const razorpaySignature = String(body.razorpaySignature ?? '');

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment verification fields.' }, { status: 400 });
    }

    const session = await prisma.paymentSession.findUnique({ where: { razorpayOrderId } });
    if (!session) {
      return NextResponse.json({ error: 'Payment session not found.' }, { status: 404 });
    }

    // Idempotent replay: this payment already settled via a previous verify or
    // the webhook — return the order it produced instead of creating a second one.
    if (session.status === 'paid' && session.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: session.orderId },
        include: { user: true },
      });
      if (order) return jsonResponse(order);
    }

    // The real gate — cryptographic signature check.
    const ok = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });
    if (!ok) {
      await prisma.paymentSession.update({
        where: { id: session.id },
        data: { status: 'failed', razorpayPaymentId },
      });
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    // Belt-and-braces: confirm with Razorpay that the payment was captured.
    // (skipped when keys are not configured, e.g. a signature-check test env)
    if (razorpayConfigured()) {
      try {
        const payment = await fetchRazorpayPayment(razorpayPaymentId);
        if (payment.status !== 'captured') {
          await prisma.paymentSession.update({
            where: { id: session.id },
            data: { status: 'failed', razorpayPaymentId },
          });
          return NextResponse.json(
            { error: `Payment not captured (${payment.status}).` },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('[payments] failed to fetch razorpay payment:', error);
        return NextResponse.json({ error: 'Could not confirm payment status. Please retry.' }, { status: 502 });
      }
    }

    // Everything checks out — create the order as paid (idempotent internally).
    const settled = await createOrderFromPaymentSession(session, {
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!settled) {
      return NextResponse.json({ error: 'Payment could not be settled.' }, { status: 409 });
    }

    return jsonResponse(settled.order);
  } catch (error) {
    console.error('[payments] verify failed:', error);
    return NextResponse.json({ error: 'Failed to verify payment.' }, { status: 500 });
  }
}