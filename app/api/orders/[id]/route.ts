import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { jsonResponse, parseBody } from '@/lib/api-utils';
import { requireAdmin } from '@/lib/admin-auth';
import { computeOrderAmounts, buildRefundUpdate } from '@/lib/order-refunds';
import { initiateRefundIfNeeded } from '@/lib/razorpay-refunds';
import { sendOrderStatusMail, sendAdminItemCancelledMail } from '@/lib/mailer';
import { sendOrderStatusUpdatedNotification } from '@/lib/notifications';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'packed'];

/** The two decisions a vendor makes on a pending order: Accept / Reject. */
const PENDING_EXIT_STATUSES = ['confirmed', 'cancelled'];

async function latestDecision(id: string) {
  return prisma.order.findUnique({
    where: { id },
    select: { id: true, orderNumber: true, status: true, paymentStatus: true, updatedAt: true },
  });
}

/**
 * Another device already moved this order out of `pending`. The decision that
 * was written first stands; we report it instead of overwriting it.
 */
function alreadyProcessed(latest: Awaited<ReturnType<typeof latestDecision>>) {
  return NextResponse.json(
    {
      error: 'ORDER_ALREADY_PROCESSED',
      message: 'This order was already handled on another device.',
      status: latest?.status ?? null,
      order: latest,
    },
    { status: 409 },
  );
}

/** Alert every admin device that this pending order has been decided. */
function announceDecision(order: { id: string; orderNumber: string } | null, status: string) {
  if (!order) return;
  sendOrderStatusUpdatedNotification({ ...order, status }).catch((e) =>
    console.error('[orders] status-push failed:', e),
  );
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await prisma.order.findUnique({
      where: { id: params.id },
      include: { user: true, items: true },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return jsonResponse({ ...item, amounts: computeOrderAmounts(item) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { payload, response } = await requireAdmin(request);
  if (!payload) return response as NextResponse;
  try {
    const body = await parseBody(request);
    const before = await prisma.order.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    // An accept/reject on a still-pending order may be decided by exactly one
    // device. The read above only chooses the code path; the writes below use a
    // conditional `status: 'pending'` claim, so a concurrent decision on
    // another phone loses and returns 409 without touching the row.
    const latching =
      before?.status === 'pending' &&
      typeof body.status === 'string' &&
      PENDING_EXIT_STATUSES.includes(body.status);

    // The same race resolved sequentially: device 2's Accept arrives after
    // device 1's Reject already committed. A rejected order must not be
    // resurrected into `confirmed`, so the existing decision stands.
    if (body.status === 'confirmed' && before?.status === 'cancelled') {
      return alreadyProcessed(await latestDecision(params.id));
    }

    // Admin directly cancels a whole active order (e.g. Reject on a new order):
    // run the same central settlement as item cancellation — every item is
    // cancelled and the full amount the customer actually paid is refunded.
    if (
      body.status === 'cancelled' &&
      before &&
      ACTIVE_STATUSES.includes(before.status)
    ) {
      const full = await prisma.order.findUnique({
        where: { id: params.id },
        include: { items: true },
      });
      if (full) {
        const openItemIds = full.items.filter((i) => !i.cancelled).map((i) => i.id);
        const wasPaid = full.paymentStatus === 'paid';
        // Treat all items as cancelled so the central rules compute a full
        // refund (original total − 0) capped at what was actually paid.
        const settlement = buildRefundUpdate({
          ...full,
          items: full.items.map((i) => ({ ...i, cancelled: true })),
        });

        const cancelWrites = () => [
          ...(openItemIds.length > 0
            ? [
                prisma.orderItem.updateMany({
                  where: { id: { in: openItemIds } },
                  data: { cancelled: true, refunded: wasPaid },
                }),
              ]
            : []),
          prisma.order.update({ where: { id: params.id }, data: { ...body, ...settlement } }),
        ];

        if (latching) {
          // Claim + settlement commit together: if the settlement fails, the
          // order must not be left cancelled-but-unsettled, or a retry would
          // 409 and the refund could never be computed.
          const decided = await prisma.$transaction(async (tx) => {
            const claim = await tx.order.updateMany({
              where: { id: params.id, status: 'pending' },
              data: { ...body, ...settlement },
            });
            if (claim.count === 0) return false;
            if (openItemIds.length > 0) {
              await tx.orderItem.updateMany({
                where: { id: { in: openItemIds } },
                data: { cancelled: true, refunded: wasPaid },
              });
            }
            return true;
          });

          if (!decided) return alreadyProcessed(await latestDecision(params.id));
        } else {
          await prisma.$transaction(cancelWrites());
        }

        const updated = await prisma.order.findUnique({
          where: { id: params.id },
          include: { items: true, user: true },
        });

        // Auto-refund a genuinely paid order through Razorpay (idempotent —
        // replays of this API call can never double-refund).
        if (updated) {
          await initiateRefundIfNeeded(updated);
        }
        const refreshed = updated ? await prisma.order.findUnique({
          where: { id: updated.id },
          include: { items: true, user: true },
        }) : null;

        // Notify the customer with the cancellation details (never blocks).
        if (refreshed) {
          const names = refreshed.items
            .filter((i) => i.cancelled)
            .map((i) => `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`);
          sendAdminItemCancelledMail(refreshed, names, computeOrderAmounts(refreshed)).catch((e) =>
            console.error('[orders] cancel-mail failed:', e)
          );
        }

        // Only the device that won the claim announces the decision, so a
        // simultaneous tap on a second phone can never duplicate it.
        announceDecision(refreshed, 'cancelled');

        return jsonResponse({
          ...(refreshed ?? {}),
          amounts: refreshed ? computeOrderAmounts(refreshed) : null,
        });
      }
    }

    // Accept on a pending order: single atomic claim, nothing else to write.
    if (latching && body.status === 'confirmed') {
      const claim = await prisma.order.updateMany({
        where: { id: params.id, status: 'pending' },
        data: body,
      });
      if (claim.count === 0) return alreadyProcessed(await latestDecision(params.id));

      const accepted = await prisma.order.findUnique({ where: { id: params.id } });
      if (accepted) {
        prisma.order
          .findUnique({ where: { id: params.id }, include: { items: true, user: true } })
          .then((full) => full && sendOrderStatusMail(full, 'confirmed'))
          .catch((e) => console.error('[orders] status-mail failed:', e));
        announceDecision(accepted, 'confirmed');
      }
      return jsonResponse(accepted);
    }

    const item = await prisma.order.update({ where: { id: params.id }, data: body });

    // Notify the customer whenever the status changes (never blocks the response)
    const newStatus = typeof body.status === 'string' ? body.status : null;
    if (newStatus && before && before.status !== newStatus) {
      prisma.order
        .findUnique({ where: { id: params.id }, include: { items: true, user: true } })
        .then((full) => full && sendOrderStatusMail(full, newStatus))
        .catch((e) => console.error('[orders] status-mail failed:', e));
    }

    return jsonResponse(item);
  } catch (error) {
    console.error('[orders] update failed:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.order.delete({ where: { id: params.id } });
    return jsonResponse({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
