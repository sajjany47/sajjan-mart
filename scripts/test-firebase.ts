/**
 * Test Firebase Admin initialization and FCM sending.
 *
 * Run with:
 *   npx dotenv -e .env.development -- npx tsx scripts/test-firebase.ts
 *
 * This script:
 * 1. Verifies Firebase Admin initializes successfully
 * 2. Checks for active admin device tokens in the database
 * 3. Sends a test NEW_ORDER FCM message to all active admin tokens
 * 4. Logs results safely (never logs tokens or private keys)
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Firebase Admin Test ===\n');

  // ── 1. Verify Firebase Admin initialization ────────────────────────
  console.log('Step 1: Firebase Admin Initialization');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  console.log('  FIREBASE_PROJECT_ID:', projectId ? 'SET' : 'MISSING');
  console.log('  FIREBASE_CLIENT_EMAIL:', clientEmail ? 'SET' : 'MISSING');
  console.log('  FIREBASE_PRIVATE_KEY:', privateKey ? 'SET' : 'MISSING');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('\n❌ Firebase credentials are not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.development');
    process.exit(1);
  }

  let app;
  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    console.log('  Using existing Firebase app');
  } else {
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    console.log('  Firebase app initialized successfully');
  }

  const messaging = getMessaging(app);
  console.log('  ✅ Firebase Messaging ready\n');

  // ── 2. Check admin device tokens ───────────────────────────────────
  console.log('Step 2: Admin Device Tokens');
  const admins = await prisma.profile.findMany({
    where: { role: 'admin' },
    select: { id: true, email: true, fullName: true },
  });
  console.log('  Admin users found:', admins.length);
  if (admins.length === 0) {
    console.warn('  ⚠️  No admin users in database. Create an admin user first.');
    process.exit(1);
  }

  const tokens = await prisma.deviceToken.findMany({
    where: {
      isActive: true,
      user: { role: 'admin' },
    },
    select: { token: true, userId: true, platform: true },
  });
  console.log('  Active admin device tokens:', tokens.length);
  if (tokens.length === 0) {
    console.warn('  ⚠️  No active admin device tokens. Register a device token first via POST /api/notifications/register-device');
    process.exit(1);
  }

  // Show token info without exposing the actual token
  tokens.forEach((t, i) => {
    console.log(`    Token ${i + 1}: platform=${t.platform}, userId=${t.userId.substring(0, 8)}...`);
  });
  console.log('');

  // ── 3. Send test FCM message ───────────────────────────────────────
  console.log('Step 3: Send Test FCM Message');
  const testPayload = {
    type: 'NEW_ORDER',
    orderId: 'test-order-' + Date.now(),
    orderNumber: 'TEST-' + Date.now(),
    customerName: 'Test Customer',
    customerPhone: '1234567890',
    address: '123 Test Street, Test City, Test State 123456',
    total: '999.00',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    itemCount: '1',
    items: JSON.stringify([
      {
        id: 'test-item-1',
        itemId: 'test-item-1',
        name: 'Test Product',
        quantity: 2,
        price: 499.5,
        unitPrice: 499.5,
        total: 999.0,
      },
    ]),
  };

  console.log('  Sending test NEW_ORDER notification...');
  const result = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    data: testPayload,
    android: {
      priority: 'high',
    },
  });

  console.log('\n  === FCM Send Result ===');
  console.log('  Admin tokens:', tokens.length);
  console.log('  Success count:', result.successCount);
  console.log('  Failure count:', result.failureCount);

  if (result.failureCount > 0) {
    console.log('\n  Individual failures:');
    result.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        console.log(`    Token ${idx + 1}: code=${resp.error.code}, message=${resp.error.message}`);
      }
    });
  }

  if (result.successCount > 0) {
    console.log('\n✅ FCM message sent successfully to', result.successCount, 'device(s)!');
  } else {
    console.error('\n❌ FCM message failed to send to all devices');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('\n❌ Test failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
