import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { createOrderFromPaymentSession } from '@/lib/razorpay-settle';
import { sendPaymentSuccessMail } from '@/lib/mailer';
import { sendNewOrderNotification } from '@/lib/notifications';

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
        const razorpayOrderId = String(entity.order_id ?? '');

        // New flow: capture settles the awaiting-payment session into a real
        // order (idempotent alongside a concurrent /api/payments/verify).
        const session = await prisma.paymentSession.findUnique({ where: { razorpayOrderId } });
        if (session) {
          const settled = await createOrderFromPaymentSession(session, {
            paymentId: String(entity.id ?? session.razorpayPaymentId ?? ''),
          });
          console.log(
            `[webhooks] payment.captured settled via session | razorpayOrderId: ${razorpayOrderId} | orderId: ${settled?.order?.id ?? 'none'} | created: ${settled?.created === true} | notification: ${settled?.created === true ? 'dispatched by settle' : 'skipped (already settled or declined)'}`
          );
          return NextResponse.json({ received: true, ...(settled && !settled.created ? { note: 'already-settled' } : settled ? { order_created: true } : { skipped: 'settle-declined' }) });
        }

        // Fallback: orders created while the session flow wasn't active, or a
        // duplicate delivery after a successful verify — mark any pending order
        // paid and notify.
        const order = await prisma.order.findFirst({
          where: { razorpayOrderId },
        });
        if (!order) return NextResponse.json({ received: true, skipped: 'order-not-found' });

        if (order.paymentStatus !== 'paid') {
          // Conditional update, not read-then-write: Razorpay retries this event
          // and a concurrent verify may be finishing the same order. Only the
          // caller that actually flips the row to `paid` (count 1) is allowed to
          // mail and push, so a retry can never produce a second alert.
          const marked = await prisma.order.updateMany({
            where: { id: order.id, paymentStatus: { not: 'paid' } },
            data: {
              paymentStatus: 'paid',
              razorpayPaymentId: String(entity.id ?? order.razorpayPaymentId ?? ''),
              paidAt: new Date(),
              paymentFailureReason: null,
            },
          });

          if (marked.count > 0) {
            console.log(
              `[webhooks] order marked paid by payment.captured | orderNumber: ${order.orderNumber} | razorpayOrderId: ${razorpayOrderId}`
            );
            const full = await prisma.order
              .findUnique({ where: { id: order.id }, include: { items: true, user: true } })
              .catch((e) => {
                console.error('[webhooks] order reload failed:', e);
                return null;
              });

            if (full) {
              sendPaymentSuccessMail(full).catch((e) =>
                console.error('[webhooks] success-mail failed:', e)
              );
              // Isolated so a Firebase problem can never fail the webhook ack —
              // a non-2xx makes Razorpay retry the event.
              try {
                await sendNewOrderNotification(full, full.items, full.user);
              } catch (e) {
                console.error(
                  '[webhooks] NEW_ORDER dispatch failed — order remains paid | orderNumber:',
                  full.orderNumber,
                  '| error:',
                  e instanceof Error ? e.message : e
                );
              }
            }
          } else {
            console.log(
              `[webhooks] payment.captured retry — already paid, notification skipped | orderNumber: ${order.orderNumber}`
            );
          }
        }
        return NextResponse.json({ received: true });
      }

      case 'payment.failed': {
        const razorpayOrderId = String(entity.order_id ?? '');

        const session = await prisma.paymentSession.findUnique({ where: { razorpayOrderId } });
        if (session && session.status !== 'paid') {
          await prisma.paymentSession.update({
            where: { id: session.id },
            data: {
              status: 'failed',
              razorpayPaymentId: String(entity.id ?? session.razorpayPaymentId ?? ''),
            },
          });
        }

        const order = await prisma.order.findFirst({ where: { razorpayOrderId } });
        if (order && order.paymentStatus !== 'paid') {
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