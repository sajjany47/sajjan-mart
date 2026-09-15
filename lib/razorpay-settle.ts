import { prisma } from '@/lib/prisma/client';
import { sendOrderPlacedMails } from '@/lib/mailer';
import type { PaymentSession } from '@prisma/client';

/**
 * Payment settlement — converts an awaiting-payment session into a REAL order.
 *
 * The store only creates an order after a payment actually succeeds, so a
 * failed/dismissed Razorpay checkout never leaves an order behind. This helper
 * is shared by `/api/payments/verify` and the `payment.captured` webhook and is
 * idempotent: whoever settles a session first (client or webhook race) creates
 * the paid order; every later attempt just returns the existing order.
 */
export function genOrderNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `SM-${y}${m}${day}-${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function createOrderFromPaymentSession(
  session: PaymentSession,
  opts?: { paymentId?: string | null; signature?: string | null }
): Promise<{ order: any; created: boolean } | null> {
  // Already settled by a previous verify/webhook — return the existing order.
  if (session.orderId) {
    const existing = await prisma.order.findUnique({
      where: { id: session.orderId },
      include: { items: true, user: true },
    });
    return existing ? { order: existing, created: false } : null;
  }

  // Only a terminal `failed` session is barred — a `pending` session created by
  // a previous attempt may be re-verified (e.g. customer retries payment).
  if (session.status === 'failed' || session.status === 'expired') return null;

  // Claim the session so exactly one of verify / webhook builds the order.
  const claimed = await prisma.paymentSession.updateMany({
    where: { id: session.id, orderId: null },
    data: { status: 'processing' },
  });
  if (claimed.count === 0) {
    // A concurrent settlement won the race — return its order if it exists.
    const fresh = await prisma.paymentSession.findUnique({ where: { id: session.id } });
    if (fresh?.orderId) {
      const existing = await prisma.order.findUnique({
        where: { id: fresh.orderId },
        include: { items: true, user: true },
      });
      return existing ? { order: existing, created: false } : null;
    }
    return null;
  }

  const payload = (session.payload ?? {}) as any;

  const paymentId = opts?.paymentId ?? session.razorpayPaymentId ?? null;
  const signature = opts?.signature ?? null;

  const orderData: any = {
    userId: String(session.userId ?? ''),
    orderNumber: genOrderNumber(),
    status: 'pending',
    subtotal: Number(payload.subtotal ?? 0),
    discount: Number(payload.discount ?? 0),
    shipping: Number(payload.shipping ?? 0),
    tax: Number(payload.tax ?? 0),
    total: Number(payload.total ?? 0),
    couponCode: payload.couponCode ?? null,
    paymentMethod: 'razorpay',
    paymentStatus: 'paid',
    address: payload.address ?? {},
    notes: payload.notes ?? null,
    razorpayOrderId: session.razorpayOrderId,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    paidAt: new Date(),
  };

  const itemRows = Array.isArray(payload.items)
    ? payload.items.map((it: any) => ({
        productId: it.productId ?? null,
        pujaId: it.pujaId ?? null,
        panditId: it.panditId ?? null,
        name: String(it.name ?? 'Item'),
        variantName: it.variantName ?? null,
        imageUrl: it.imageUrl ?? null,
        unitPrice: Number(it.unitPrice ?? 0),
        quantity: Number(it.quantity ?? 1),
        total: Number(it.total ?? 0),
        itemType: it.itemType ?? 'product',
        metadata: it.metadata ?? {},
      }))
    : [];

  try {
    const order = await prisma.order.create({
      data: {
        ...orderData,
        ...(itemRows.length > 0 ? { items: { create: itemRows } } : {}),
      },
    });

    await prisma.paymentSession.update({
      where: { id: session.id },
      data: { status: 'paid', orderId: order.id, razorpayPaymentId: paymentId },
    });

    // Notify customer + admin that the order is now placed (never blocks).
    prisma.order
      .findUnique({ where: { id: order.id }, include: { items: true, user: true } })
      .then((full) => full && sendOrderPlacedMails(full))
      .catch((e) => console.error('[payments] placed-mail failed:', e));

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, user: true },
    });
    return { order: full ?? order, created: true };
  } catch (error) {
    // Release the claim so a retry can settle this session instead of leaving
    // it stuck in `processing`.
    await prisma.paymentSession
      .update({ where: { id: session.id }, data: { status: 'pending' } })
      .catch(() => {});
    throw error;
  }
}