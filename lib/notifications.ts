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
      select: { token: true, userId: true },
    });

    if (tokens.length === 0) {
      console.warn(
        `[notifications] No active admin device tokens found | active admin devices: 0 | skipping push for order ${order.orderNumber}`,
      );
      return;
    }

    const uniqueAdminIds = Array.from(new Set(tokens.map((t) => t.userId)));
    console.log(
      `[notifications] Dispatching NEW_ORDER push for order ${order.orderNumber} | active admin devices: ${tokens.length} | admin user IDs: [${uniqueAdminIds.join(', ')}]`,
    );

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

    const customerName =
      user?.fullName ||
      String(addressObj.full_name || addressObj.name || 'Customer');
    const customerPhone =
      user?.phone ||
      String(addressObj.phone || '');

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

    const itemCount = String(items.length);

    // All FCM data values MUST be strings.
    const data: Record<string, string> = {
      type: 'NEW_ORDER',
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName,
      customerPhone,
      address: addressStr,
      total: String(Number(order.total) || 0),
      paymentMethod: order.paymentMethod || 'cod',
      paymentStatus: order.paymentStatus || 'pending',
      itemCount,
      items: JSON.stringify(payloadItems),
    };

    // ── 3. Send data-only multicast with high Android priority ────────
    // Data-only messages prevent duplicate system notifications while
    // android.priority = 'high' ensures immediate delivery even when the
    // phone is asleep or in Doze mode.
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
      `[notifications] FCM NEW_ORDER send completed for order ${order.orderNumber} | status: ${sendStatus} | active admin devices: ${tokens.length} | success: ${result.successCount} | failure: ${result.failureCount}`,
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
    // Notification failure must NEVER break order creation.
    console.error('[notifications] sendNewOrderNotification error for order', order.orderNumber, ':', err instanceof Error ? err.message : err);
  }
}
