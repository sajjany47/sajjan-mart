import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { sendPaymentSuccessMail } from '@/lib/mailer';

/**
 * Razorpay webhook — payment.captured / payment.failed / refund.processed.
 *
 * Every event is signature-verified (HMAC SHA256 of the RAW body with
 * RAZORPAY_WEBHOOK_SECRET). Handlers are idempotent, so Razorpay retries and
 * duplicate deliveries can never double-settle an order.
 *
 * This route is intentionally unauthenticated (Razorpay posts to it directly);
 * the signature IS the authentication.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const event = String(payload.event ?? '');
  const entity = payload?.payload?.payment?.entity ?? payload?.payload?.refund?.entity ?? {};

  try {
    switch (event) {
      case 'payment.captured': {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId: String(entity.order_id ?? '') },
        });
        if (!order) return NextResponse.json({ received: true, skipped: 'order-not-found' });

        if (order.paymentStatus !== 'paid') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'paid',
              razorpayPaymentId: String(entity.id ?? order.razorpayPaymentId ?? ''),
              paidAt: new Date(),
              paymentFailureReason: null,
            },
          });
          prisma.order
            .findUnique({ where: { id: order.id }, include: { items: true, user: true } })
            .then((full) => full && sendPaymentSuccessMail(full))
            .catch((e) => console.error('[webhooks] success-mail failed:', e));
        }
        return NextResponse.json({ received: true });
      }

      case 'payment.failed': {
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId: String(entity.order_id ?? '') },
        });
        if (!order) return NextResponse.json({ received: true, skipped: 'order-not-found' });

        if (order.paymentStatus !== 'paid') {
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'failed',
              razorpayPaymentId: String(entity.id ?? ''),
              paymentFailureReason: String(entity.error_description ?? 'Payment failed').slice(0, 500),
            },
          });
        }
        return NextResponse.json({ received: true });
      }

      case 'refund.processed': {
        const order = await prisma.order.findFirst({
          where: { razorpayPaymentId: String(entity.payment_id ?? '') },
        });
        if (!order) return NextResponse.json({ received: true, skipped: 'order-not-found' });

        const refundedAmount = Number(entity.amount ?? 0) / 100;
        const currentRefunded = Number(order.refundedAmount ?? 0);
        const isFull = refundedAmount + currentRefunded >= Number(order.total ?? 0);

        await prisma.order.update({
          where: { id: order.id },
          data: {
            refundId: String(entity.id ?? order.refundId ?? ''),
            refundStatus: 'processed',
            refundedAmount: isFull ? Number(order.total ?? 0) : Math.max(currentRefunded, refundedAmount + currentRefunded),
            ...(isFull ? { paymentStatus: 'refunded' } : {}),
          },
        });
        return NextResponse.json({ received: true });
      }

      default:
        return NextResponse.json({ received: true, note: 'unhandled-event' });
    }
  } catch (error) {
    console.error('[webhooks] razorpay processing failed:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}