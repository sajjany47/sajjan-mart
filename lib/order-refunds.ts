import type { Order, OrderItem } from '@prisma/client';

/**
 * Central order amount calculation — the single source of truth used by the
 * orders APIs, admin UI, customer UI and the delivery handoff view.
 *
 * Business rules (mirroring lib/store-config-utils.ts used at checkout):
 * - Tax is `Math.round(subtotal * rate%)`; the rate is derived from the order
 *   itself so historical orders recalculate consistently.
 * - The delivery charge stays as originally charged as long as at least one
 *   active item remains; it is refunded (0) only when nothing remains.
 * - Coupon discount is distributed proportionally across items by their share
 *   of the original subtotal.
 */

export type AmountsOrder = Pick<
  Order,
  'subtotal' | 'discount' | 'shipping' | 'tax' | 'total' | 'refundedAmount' | 'paymentStatus'
> & { items: Array<Pick<OrderItem, 'id' | 'total' | 'cancelled'>> };

export interface OrderAmounts {
  original_subtotal: number;
  active_subtotal: number;
  cancelled_subtotal: number;
  discount_original: number;
  discount_active: number;
  tax_rate_pct: number;
  updated_tax: number;
  updated_shipping: number;
  original_total: number;
  updated_total: number;
  refunded_so_far: number;
  refund_due_total: number;
  refund_pending: number;
  cod_collect: number;
  is_prepaid_paid: boolean;
  has_cancellation: boolean;
  fully_cancelled: boolean;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Compute every display/settlement amount for an order from its current state. */
export function computeOrderAmounts(order: AmountsOrder): OrderAmounts {
  const items = order.items ?? [];
  const active = items.filter((i) => !i.cancelled);
  const cancelled = items.filter((i) => i.cancelled);

  const activeSubtotal = round2(active.reduce((s, i) => s + Number(i.total), 0));
  const cancelledSubtotal = round2(cancelled.reduce((s, i) => s + Number(i.total), 0));

  const subtotalOriginal = Number(order.subtotal ?? 0);
  const discountOriginal = Number(order.discount ?? 0);
  const taxOriginal = Number(order.tax ?? 0);
  const shippingOriginal = Number(order.shipping ?? 0);
  const totalOriginal = Number(order.total ?? 0);

  // Derive the effective tax rate from what was actually charged on this order.
  const taxRate = subtotalOriginal > 0 ? taxOriginal / subtotalOriginal : 0;

  // Existing rule: keep the applicable delivery charge while any item remains.
  const hasCancellation = cancelled.length > 0;
  const fullyCancelled = items.length > 0 && active.length === 0;
  const updatedShipping = fullyCancelled ? 0 : shippingOriginal;

  // Proportional share of the coupon that still applies to remaining items.
  const activeShare = subtotalOriginal > 0 ? activeSubtotal / subtotalOriginal : 1;
  const discountActive = round2(discountOriginal * activeShare);

  // Same rounding rule as checkout: Math.round(subtotal * rate).
  const updatedTax = Math.round(activeSubtotal * taxRate);

  const updatedTotal = Math.max(
    0,
    round2(activeSubtotal - discountActive + updatedTax + updatedShipping)
  );

  const isPrepaidPaid = String(order.paymentStatus) === 'paid';
  const refundDueTotal = Math.max(0, Math.min(round2(totalOriginal - updatedTotal), totalOriginal));
  const refundedSoFar = Math.min(Number(order.refundedAmount ?? 0), totalOriginal);
  const refundPending = Math.max(0, round2(refundDueTotal - refundedSoFar));

  return {
    original_subtotal: round2(subtotalOriginal),
    active_subtotal: activeSubtotal,
    cancelled_subtotal: cancelledSubtotal,
    discount_original: round2(discountOriginal),
    discount_active: discountActive,
    tax_rate_pct: Math.round(taxRate * 10000) / 100,
    updated_tax: updatedTax,
    updated_shipping: updatedShipping,
    original_total: round2(totalOriginal),
    updated_total: updatedTotal,
    refunded_so_far: round2(refundedSoFar),
    refund_due_total: refundDueTotal,
    refund_pending: refundPending,
    // COD / unpaid orders have nothing collected yet — the delivery boy must
    // collect the UPDATED value, never the original total.
    cod_collect: isPrepaidPaid ? 0 : updatedTotal,
    is_prepaid_paid: isPrepaidPaid,
    has_cancellation: hasCancellation,
    fully_cancelled: fullyCancelled,
  };
}

/**
 * Persisted order-level update after items were cancelled. Only money actually
 * captured (prepaid + paid) is recorded as refunded — COD/unpaid orders simply
 * get a lower collection amount at the door.
 */
export function buildRefundUpdate(
  order: AmountsOrder & { orderNumber?: string }
): Record<string, unknown> {
  const amounts = computeOrderAmounts(order);
  const update: Record<string, unknown> = {};

  if (amounts.is_prepaid_paid) {
    // Never exceeds what the customer actually paid.
    update.refundedAmount = Math.min(amounts.refund_due_total, amounts.original_total);
  }

  if (amounts.fully_cancelled) {
    update.status = 'cancelled';
    if (amounts.is_prepaid_paid) {
      update.paymentStatus = 'refunded';
      update.refundId = makeRefundId(order.orderNumber ?? '');
    }
  }

  return update;
}

/** Internal refund reference stored on the order for audit/idempotency. */
export function makeRefundId(orderNumber: string): string {
  return `RFD-${orderNumber || 'ORD'}-${Date.now().toString(36)}`;
}
