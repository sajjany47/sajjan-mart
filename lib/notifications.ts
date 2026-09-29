import { prisma } from '@/lib/prisma/client';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

/**
 * FCM transport shared by every admin device alert.
 *
 * Recipient rule is unchanged and must stay unchanged: only tokens that are
 * `isActive` AND belong to a profile with `role === 'admin'`.
 *
 * Payloads are data-only (no `notification` field) so a killed Android process
 * still receives the data; `android.priority = 'high'` bypasses Doze. Every
 * value must be a string — FCM enforces it at the wire level.
 *
 * Both `type` and `eventType` are sent: builds already installed in the field
 * (JS listeners and the native CustomMessagingReceiver) key on `type`, while
 * new clients key on `eventType`.
 */
async function sendToActiveAdminDevices(
  data: Record<string, string>,
  logRef: string,
): Promise<void> {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn(
        `[notifications] Firebase Messaging not available — skipping ${data.type} push ${logRef}`,
      );
      return;
    }

    // ── 1. Find active device tokens for admin users ──────────────────
    const tokens = await prisma.deviceToken.findMany({
      where: {
        isActive: true,
        user: { role: 'admin' },
      },
      select: { token: true, userId: true },
    });

    if (tokens.length === 0) {
      console.warn(
        `[notifications] No active admin device tokens found | active admin devices: 0 | skipping ${data.type} push ${logRef}`,
      );
      return;
    }

    const uniqueAdminIds = Array.from(new Set(tokens.map((t) => t.userId)));
    console.log(
      `[notifications] Dispatching ${data.type} push ${logRef} | active admin devices: ${tokens.length} | admin user IDs: [${uniqueAdminIds.join(', ')}]`,
    );

    // ── 2. Send data-only multicast with high Android priority ────────
    const result = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      data,
      android: {
        priority: 'high',
      },
    });

    const sendStatus =
      result.failureCount === 0
        ? 'SUCCESS'
        : result.successCount > 0
          ? 'PARTIAL_SUCCESS'
          : 'FAILURE';

    console.log(
      `[notifications] FCM ${data.type} send completed ${logRef} | status: ${sendStatus} | active admin devices: ${tokens.length} | success: ${result.successCount} | failure: ${result.failureCount}`,
    );

    // Deactivate stale or unregistered tokens
    if (result.failureCount > 0) {
      const staleTokens: string[] = [];
      result.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            staleTokens.push(tokens[idx].token);
          }
          // Device index + admin id + FCM code only — never the token itself.
          console.error(
            `[notifications] FCM send failure for device ${idx + 1}/${tokens.length} | admin userId: ${tokens[idx].userId} | code: ${resp.error.code} | message: ${resp.error.message}`,
          );
        }
      });

      if (staleTokens.length > 0) {
        try {
          await prisma.deviceToken.updateMany({
            where: { token: { in: staleTokens } },
            data: { isActive: false },
          });
          console.log('[notifications] Deactivated', staleTokens.length, 'invalid/stale token(s)');
        } catch (cleanupErr) {
          console.error('[notifications] Failed to deactivate stale tokens:', cleanupErr);
        }
      }
    }
  } catch (err) {
    // Notification failure must NEVER break the caller's flow.
    console.error(
      `[notifications] sendToActiveAdminDevices error (${data.type}) ${logRef}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Deterministic, dedupe-friendly event id.
 *
 * A random UUID would be wrong: the client must be able to recognise a
 * re-delivered FCM event as the SAME event, and only a stable
 * `eventType:orderId:decision` key survives a redelivery.
 */
export function buildEventId(
  eventType: string,
  orderId: string,
  decision?: string,
): string {
  return decision ? `${eventType}:${orderId}:${decision}` : `${eventType}:${orderId}`;
}

/** Backend status -> the decision word devices are told about. */
const STATUS_DECISION: Record<string, string> = {
  confirmed: 'ACCEPTED',
  cancelled: 'REJECTED',
};

/**
 * Build the NEW_ORDER data payload. Exported so the contract (every value a
 * string, `eventType`/`orderId`/`eventId` present) is testable without Firebase.
 */
export function buildNewOrderData(
  order: {
    id: string;
    orderNumber: string;
    total: unknown;
    paymentMethod: string;
    paymentStatus: string;
    address: unknown;
  },
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: unknown;
    total: unknown;
  }>,
  user?: { fullName?: string | null; phone?: string | null } | null,
): Record<string, string> {
  const addressObj =
    order.address && typeof order.address === 'object'
      ? (order.address as Record<string, unknown>)
      : {};
  const addressStr = [
    addressObj.line1,
    addressObj.line2,
    addressObj.city,
    addressObj.state,
    addressObj.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const customerName =
    user?.fullName ||
    String(addressObj.full_name || addressObj.name || 'Customer');
  const customerPhone = user?.phone || String(addressObj.phone || '');

  const payloadItems = items.map((it, idx) => {
    const unitPriceNum = Number(it.unitPrice) || 0;
    const totalNum =
      Number(it.total) || unitPriceNum * (Number(it.quantity) || 1);
    return {
      id: it.id || String(idx + 1),
      itemId: it.id || String(idx + 1),
      name: it.name || `Item ${idx + 1}`,
      variantName: (it as any).variantName || '',
      quantity: Number(it.quantity) || 1,
      price: unitPriceNum,
      unitPrice: unitPriceNum,
      total: totalNum,
      image: (it as any).imageUrl || '',
    };
  });

  // All FCM data values MUST be strings.
  return {
    type: 'NEW_ORDER',
    eventType: 'NEW_ORDER',
    eventId: buildEventId('NEW_ORDER', order.id),
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName,
    customerPhone,
    address: addressStr,
    total: String(Number(order.total) || 0),
    paymentMethod: order.paymentMethod || 'cod',
    paymentStatus: order.paymentStatus || 'pending',
    itemCount: String(items.length),
    items: JSON.stringify(payloadItems),
  };
}

/**
 * Send a NEW_ORDER FCM notification to every active admin device token.
 *
 * This function is fire-and-forget: it never throws and never blocks the caller.
 */
export async function sendNewOrderNotification(
  order: {
    id: string;
    orderNumber: string;
    total: unknown;
    paymentMethod: string;
    paymentStatus: string;
    address: unknown;
    userId: string;
  },
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: unknown;
    total: unknown;
  }>,
  user?: { fullName?: string | null; phone?: string | null } | null,
) {
  const data = buildNewOrderData(order, items, user);
  await sendToActiveAdminDevices(data, `for order ${order.orderNumber}`);
}

/**
 * Build the ORDER_STATUS_UPDATED data payload — see
 * sendOrderStatusUpdatedNotification for when it is sent.
 *
 * The device contract is `status: ACCEPTED | REJECTED` (not the backend's
 * internal `confirmed` / `cancelled` strings), so a phone can act on the event
 * without knowing our status vocabulary.
 */
export function buildOrderStatusUpdatedData(order: {
  id: string;
  orderNumber: string;
  status: string;
}): Record<string, string> {
  const decision =
    STATUS_DECISION[order.status] ?? order.status.toUpperCase();
  return {
    type: 'ORDER_STATUS_UPDATED',
    eventType: 'ORDER_STATUS_UPDATED',
    eventId: buildEventId('ORDER_STATUS_UPDATED', order.id, decision),
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: decision,
    // Same value on purpose: older builds key on `type`, and a device that
    // reads `decision` never has to map statuses.
    decision,
  };
}

/**
 * Tell every active admin device that a pending order has been decided
 * (ACCEPTED / REJECTED) — so the other phones stop ringing and drop the alert.
 *
 * Sent to ALL admin devices including the one that acted: that device has
 * already cleaned up locally, and the event is idempotent, which is simpler
 * and safer than trying to exclude a sending device by token.
 *
 * Fire-and-forget: never throws, never blocks the API response.
 */
export async function sendOrderStatusUpdatedNotification(order: {
  id: string;
  orderNumber: string;
  status: string;
}) {
  const data = buildOrderStatusUpdatedData(order);
  await sendToActiveAdminDevices(data, `for order ${order.orderNumber} -> ${data.status}`);
}

