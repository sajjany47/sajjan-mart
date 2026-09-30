/**
 * Throwaway probe — deleted after the run.
 *
 *   npx dotenv -e .env.development -- npx tsx probe-targeted-push.ts <device-token-id>
 *
 * Sends ONE data message to a single DeviceToken row, addressed by row id, using
 * the Firebase credentials that only the development env carries. It exists to
 * separate an app-side release problem from the deployment's missing Firebase
 * credentials: if the installed release build receives this, its FCM path works.
 *
 * Creates no order, no database write, no mail, and touches no other device.
 * The token itself is never printed.
 */
import { PrismaClient } from '@prisma/client';
import { getFirebaseMessaging } from './lib/firebase-admin';

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('a device-token row id is required');

  const row = await prisma.deviceToken.findUnique({ where: { id } });
  if (!row) throw new Error(`no DeviceToken row with id ${id}`);
  console.log(
    `target row: active=${row.isActive} platform=${row.platform} tokenLength=${row.token.length}`,
  );

  const messaging = getFirebaseMessaging();
  if (!messaging) throw new Error('Firebase messaging unavailable in this env');

  const stamp = Date.now();
  const response = await messaging.send({
    token: row.token,
    data: {
      type: 'NEW_ORDER',
      // A probe, never a real order: nothing in the database carries this id,
      // so no decision path can latch onto it.
      orderId: `release-probe-${stamp}`,
      orderNumber: `PROBE-${stamp}`,
      customerName: 'Release Probe',
      customerPhone: '0000000000',
      address: 'Probe address',
      total: '1',
      itemCount: '1',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      items: JSON.stringify([
        {
          id: 'probe-item',
          itemId: 'probe-item',
          name: 'Probe item',
          quantity: 1,
          price: 1,
          unitPrice: 1,
          total: 1,
        },
      ]),
    },
    android: { priority: 'high' },
  });

  console.log(`FCM send accepted by Google: ${response.startsWith('projects/')}`);
}

main()
  .catch(err => console.error('probe failed:', err instanceof Error ? err.message : err))
  .finally(() => prisma.$disconnect());
