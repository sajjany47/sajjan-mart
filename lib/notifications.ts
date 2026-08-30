import { prisma } from '@/lib/prisma/client';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

/**
 * Send a NEW_ORDER FCM notification to every active admin device token.
 *
 * Uses a **data-only** payload (no `notification` field) so that the React
 * Native app receives the data even when the process is completely killed.
 * React Native Firebase handles display via `setBackgroundMessageHandler`.
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
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) {
      console.warn('[notifications] Firebase Messaging not available — skipping NEW_ORDER push for order', order.orderNumber);
      return;
    }

    // ── 1. Find active device tokens for admin users ──────────────────
    const tokens = await prisma.deviceToken.findMany({
      where: {
        isActive: true,
        user: { role: 'admin' },
      },
      select: { token: true },
    });

    if (tokens.length === 0) {
      console.warn('[notifications] No active admin device tokens found — skipping push for order', order.orderNumber);
      return;
    }

    // ── 2. Build the data payload ─────────────────────────────────────
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

    const customerName = user?.fullName || String(addressObj.full_name || '');
    const customerPhone = user?.phone || String(addressObj.phone || '');

    const payloadItems = items.map((it) => ({
      itemId: it.id,
      name: it.name,
      quantity: String(it.quantity),
      unitPrice: String(Number(it.unitPrice)),
      total: String(Number(it.total)),
    }));

    // All FCM data values MUST be strings.
    const data: Record<string, string> = {
      type: 'NEW_ORDER',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName,
      customerPhone,
      address: addressStr,
      total: String(Number(order.total)),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      items: JSON.stringify(payloadItems),
    };

    // ── 3. Send data-only multicast ───────────────────────────────────
    // Data-only messages are delivered even when the app is killed.
    // React Native Firebase must register a `setBackgroundMessageHandler`
    // to process them in that state.
    const result = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      data,
    });

    console.log(
      '[notifications] FCM NEW_ORDER sent for order', order.orderNumber,
      '| admin tokens:', tokens.length,
      '| success:', result.successCount,
      '| failure:', result.failureCount,
    );

    // Log individual failures (error codes only, never the tokens themselves)
    if (result.failureCount > 0) {
      result.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          console.error(
            '[notifications] FCM failure at index', idx,
            '| code:', resp.error.code,
            '| message:', resp.error.message,
          );
        }
      });
    }
  } catch (err) {
    // Notification failure must NEVER break order creation.
    console.error('[notifications] sendNewOrderNotification error for order', order.orderNumber, ':', err instanceof Error ? err.message : err);
  }
}
