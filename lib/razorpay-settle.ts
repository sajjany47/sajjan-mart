import { prisma } from '@/lib/prisma/client';
import { sendOrderPlacedMails } from '@/lib/mailer';
import { sendNewOrderNotification } from '@/lib/notifications';
import type { PaymentSession } from '@prisma/client';

/** A claim left in `processing` this long was abandoned by a crashed settle. */
const STALE_CLAIM_MS = 2 * 60 * 1000;

/** Backoff used by the loser of a verify-vs-webhook race to find the winner. */
const SETTLE_RACE_POLL_MS = [0, 80, 150, 250];

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

/**
 * The claim is held by a concurrent settlement (verify vs `payment.captured`).
 * Poll briefly for the order it publishes so the loser returns the real order
 * instead of a spurious failure. Never returns `created: true` — the holder of
 * the claim owns the admin notification.
 */
async function waitForConcurrentSettlement(
  sessionId: string
): Promise<{ order: any; created: false } | null> {
  for (const delay of SETTLE_RACE_POLL_MS) {
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

    const fresh = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
    if (!fresh) return null;

    if (fresh.orderId) {
      const existing = await prisma.order.findUnique({
        where: { id: fresh.orderId },
        include: { items: true, user: true },
      });
      if (existing) {
        console.log(
          `[payments] concurrent settlement observed | orderNumber: ${existing.orderNumber} | razorpayOrderId: ${fresh.razorpayOrderId} | notification skipped`
        );
        return { order: existing, created: false };
      }
    }
    if (fresh.status === 'failed' || fresh.status === 'expired') return null;
  }
  return null;
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
    if (existing) {
      console.log(
        `[payments] settlement replay — order already finalised, notification skipped | orderNumber: ${existing.orderNumber} | razorpayOrderId: ${session.razorpayOrderId}`
      );
    }
    return existing ? { order: existing, created: false } : null;
  }

  // Only a terminal `failed` session is barred — a `pending` session created by
  // a previous attempt may be re-verified (e.g. customer retries payment).
  if (session.status === 'failed' || session.status === 'expired') return null;

  // ── Claim the session ────────────────────────────────────────────────
  // This conditional update is the idempotency guard for BOTH the paid order
  // row and the NEW_ORDER push, keyed on the payment identity (razorpayOrderId
  // → session row). `orderId: null` alone was not exclusive: verify and the
  // `payment.captured` webhook both matched it concurrently and each created an
  // order. Requiring `status: 'pending'` makes it atomic — Postgres locks the
  // row, the loser re-evaluates the predicate against the now-`processing` row
  // and receives count 0, so exactly one caller gets created: true and pushes.
  // A stale `processing` claim (process killed mid-settle) stays reclaimable.
  const claimed = await prisma.paymentSession.updateMany({
    where: {
      id: session.id,
      orderId: null,
      OR: [
        { status: 'pending' },
        {
          status: 'processing',
          updatedAt: { lt: new Date(Date.now() - STALE_CLAIM_MS) },
        },
      ],
    },
    data: { status: 'processing' },
  });
  if (claimed.count === 0) {
    // A concurrent settlement won the claim — hand back its order rather than
    // failing the caller. created is always false here, which is what keeps the
    // admin alert to a single push.
    return waitForConcurrentSettlement(session.id);
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

    console.log(
      `[payments] order finalised as paid | orderNumber: ${order.orderNumber} | paymentStatus: paid | razorpayOrderId: ${session.razorpayOrderId}`
    );

    // Notify customer + admin that the order is now placed (never blocks).
    prisma.order
      .findUnique({ where: { id: order.id }, include: { items: true, user: true } })
      .then((full) => full && sendOrderPlacedMails(full))
      .catch((e) => console.error('[payments] placed-mail failed:', e));

    const full = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true, user: true },
    });

    // ── Admin NEW_ORDER push ───────────────────────────────────────────
    // This is the single trigger for prepaid orders: it sits on the shared
    // finalisation point used by /api/payments/verify AND the
    // `payment.captured` webhook, runs only for the caller that won the claim
    // (created === true), and only after the session is committed as `paid`.
    // A pending/failed/unverified payment never reaches this line.
    //
    // Awaited so the push leaves before the response returns, but isolated in
    // its own try/catch: a Firebase/FCM problem must never unwind into the
    // settle error handler below, which releases the claim and would let a
    // retry re-settle an already-successful payment.
    if (full) {
      console.log(
        `[notifications] dispatch started for order ${full.orderNumber} | source: razorpay-settle`
      );
      try {
        await sendNewOrderNotification(full, full.items, full.user);
      } catch (e) {
        console.error(
          '[notifications] dispatch failed — order remains paid | orderNumber:',
          full.orderNumber,
          '| error:',
          e instanceof Error ? e.message : e
        );
      }
    }

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