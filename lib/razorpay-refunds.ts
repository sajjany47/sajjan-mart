import type { Order, OrderItem } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { computeOrderAmounts, round2 } from '@/lib/order-refunds';
import { createRazorpayRefund } from '@/lib/razorpay';

/**
 * Server-only idempotent Razorpay refund initiation. Runs AFTER the central
 * settlement (`buildRefundUpdate`) so only orders with real captured money are
 * touched, and the refunded amount only ever records what Razorpay accepted.
 *
 * Guards (all must hold):
 * - `paymentStatus === 'paid'` — only captured money can be refunded
 * - a `razorpayPaymentId` exists (a real payment was made through checkout)
 * - no refund is currently in flight (`refundStatus !== 'pending'`)
 * - there is actually something left to refund (`refund_pending > 0`)
 *
 * A replay of the same cancellation sees `refundedAmount` already bumped and
 * therefore `refund_pending === 0`, so duplicate clicks can never double-refund.
 */

type RefundableOrder = Pick<
  Order,
  | 'id'
  | 'orderNumber'
  | 'paymentStatus'
  | 'razorpayPaymentId'
  | 'refundStatus'
  | 'refundedAmount'
  | 'status'
  | 'subtotal'
  | 'discount'
  | 'shipping'
  | 'tax'
  | 'total'
> & { items: Array<Pick<OrderItem, 'id' | 'total' | 'cancelled'>> };

export async function initiateRefundIfNeeded(order: RefundableOrder): Promise<{
  initiated: boolean;
  amount?: number;
  refundId?: string | null;
}> {
  if (order.paymentStatus !== 'paid') return { initiated: false };
  if (!order.razorpayPaymentId) return { initiated: false };
  if (order.refundStatus === 'pending') return { initiated: false };

  const amounts = computeOrderAmounts(order);
  if (amounts.refund_pending <= 0) return { initiated: false };

  let refund;
  try {
    refund = await createRazorpayRefund(order.razorpayPaymentId, amounts.refund_pending);
  } catch (error) {
    console.error('[refund] initiation failed:', error);
    await prisma.order
      .update({ where: { id: order.id }, data: { refundStatus: 'failed' } })
      .catch(() => {});
    return { initiated: false };
  }

  // "processed" accepts immediately; "pending" means the bank is working on it.
  const inFlight = refund.status !== 'failed';
  if (!inFlight) {
    await prisma.order
      .update({ where: { id: order.id }, data: { refundStatus: 'failed', refundId: refund.id } })
      .catch(() => {});
    return { initiated: false };
  }

  const refundedSoFar = round2(Number(order.refundedAmount ?? 0));
  const refundedAmount = round2(refundedSoFar + amounts.refund_pending);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      refundedAmount,
      refundId: refund.id,
      refundStatus: refund.status === 'processed' ? 'processed' : 'pending',
      // Full refund = the customer no longer owes anything for this payment.
      ...(amounts.fully_cancelled ? { paymentStatus: 'refunded' } : {}),
    },
  });

  return {
    initiated: true,
    amount: round2(amounts.refund_pending),
    refundId: refund.id,
  };
}