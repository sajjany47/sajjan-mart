/**
 * Verification harness for the payment-success → NEW_ORDER notification flow.
 *
 *   npx dotenv -e .env.development -- npx tsx scripts/test-payment-notification-flow.ts
 *
 * Firebase credentials are withheld for the whole run, so sendNewOrderNotification
 * logs "Messaging not available" instead of pushing to a real admin device. That
 * log line is the dispatch counter: exactly one per notification attempt.
 *
 * Every row it writes is tagged with the TESTFLOW_ prefix and deleted on exit.
 */

import { prisma } from '@/lib/prisma/client';
import { createOrderFromPaymentSession } from '@/lib/razorpay-settle';
import { POST as postOrder } from '@/app/api/orders/route';

const TAG = 'TESTFLOW';
const DISPATCH_MARKER = 'not available — skipping NEW_ORDER push for order';

let logBuffer: string[] = [];
const realLog = console.log.bind(console);
const tee =
  (sink: (...a: unknown[]) => void) =>
  (...args: unknown[]) => {
    logBuffer.push(args.map(String).join(' '));
    sink(...args);
  };
// lib/notifications.ts reports the unavailable-Messaging path through
// console.warn, so both streams must be captured.
console.log = tee(realLog) as typeof console.log;
console.warn = tee(console.warn.bind(console)) as typeof console.warn;

const dispatchCount = () => logBuffer.filter((l) => l.includes(DISPATCH_MARKER)).length;

type Case = { name: string; ok: boolean; detail: string };
const results: Case[] = [];
function check(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  realLog(`${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
}

const createdSessions: string[] = [];
const createdOrders: string[] = [];

function newRzOrderId(label: string) {
  return `${TAG}_${label}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
}

async function makeSession(status = 'pending') {
  const userId = process.env.TESTFLOW_USER_ID as string;
  const session = await prisma.paymentSession.create({
    data: {
      razorpayOrderId: newRzOrderId('rz'),
      userId,
      status,
      payload: {
        userId,
        subtotal: 1,
        discount: 0,
        shipping: 0,
        tax: 0,
        total: 1,
        couponCode: null,
        address: { line1: `${TAG} test street`, city: TAG },
        notes: `${TAG} notification-flow harness`,
        hasFood: false,
        items: [
          {
            productId: null,
            pujaId: null,
            panditId: null,
            name: `${TAG} harness item`,
            variantName: null,
            imageUrl: null,
            unitPrice: 1,
            quantity: 1,
            total: 1,
            itemType: 'product',
            metadata: {},
          },
        ],
      },
    },
  });
  createdSessions.push(session.id);
  return session;
}

async function main() {
  // Disable Firebase Admin for this run (see header comment).
  for (const key of [
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
  ]) {
    delete process.env[key];
  }

  const buyer = await prisma.profile.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!buyer) throw new Error('No active profile available to own test rows');
  process.env.TESTFLOW_USER_ID = buyer.id;

  /* ── A / G: settle once → exactly one dispatch, payment still succeeds ── */
  {
    const session = await makeSession();
    logBuffer = [];
    const settled = await createOrderFromPaymentSession(session, {
      paymentId: `${TAG}_pay`,
    });
    if (settled?.order?.id) createdOrders.push(settled.order.id);
    const paid = await prisma.paymentSession.findFirst({
      where: { id: session.id, status: 'paid', orderId: settled?.order?.id },
    });
    check(
      'A1 order finalised as paid',
      settled?.created === true && settled.order.paymentStatus === 'paid',
      `created=${settled?.created} paymentStatus=${settled?.order?.paymentStatus}`,
    );
    check(
      'A2 exactly one admin notification dispatched',
      dispatchCount() === 1,
      `dispatch attempts=${dispatchCount()} (expect 1)`,
    );
    check(
      'G1 missing Firebase does not fail the payment',
      Boolean(paid),
      'session committed paid with messaging unavailable',
    );
  }

  /* ── C: replay of a settled session must not re-notify ─────────────── */
  {
    const session = await makeSession();
    const first = await createOrderFromPaymentSession(session, {
      paymentId: `${TAG}_pay`,
    });
    if (first?.order?.id) createdOrders.push(first.order.id);
    const settledRow = await prisma.paymentSession.findUnique({
      where: { id: session.id },
    });
    logBuffer = [];
    const replay = await createOrderFromPaymentSession(settledRow!);
    check(
      'C1 replay returns the existing order, created=false',
      replay?.created === false && replay?.order?.id === first?.order?.id,
      `created=${replay?.created} sameOrder=${replay?.order?.id === first?.order?.id}`,
    );
    check(
      'C2 replay dispatches nothing',
      dispatchCount() === 0,
      `dispatch attempts=${dispatchCount()} (expect 0)`,
    );
  }

  /* ── C3: verify vs webhook race — both hold the same pre-claim row ─── */
  {
    const session = await makeSession();
    const stale = await prisma.paymentSession.findUnique({
      where: { id: session.id },
    });
    logBuffer = [];
    const [verifyResult, webhookResult] = await Promise.all([
      createOrderFromPaymentSession(stale!, { paymentId: `${TAG}_verify` }),
      createOrderFromPaymentSession(stale!, { paymentId: `${TAG}_webhook` }),
    ]);
    const orders = await prisma.order.findMany({
      where: { razorpayOrderId: stale!.razorpayOrderId },
      select: { id: true },
    });
    createdOrders.push(...orders.map((o) => o.id));
    check(
      'C3 concurrent settle creates exactly one order',
      orders.length === 1 &&
        [verifyResult, webhookResult].filter((r) => r?.created).length === 1,
      `order rows=${orders.length}`,
    );
    check(
      'C3 concurrent settle dispatches exactly one notification',
      dispatchCount() === 1,
      `dispatch attempts=${dispatchCount()} (expect 1)`,
    );
    const loser = verifyResult?.created ? webhookResult : verifyResult;
    realLog(`      loser returned ${loser ? `order ${loser.order?.id}` : 'null'}`);
  }

  /* ── B: a failed payment never settles or notifies ─────────────────── */
  {
    const session = await makeSession('failed');
    logBuffer = [];
    const settled = await createOrderFromPaymentSession(session);
    const rows = await prisma.order.count({
      where: { razorpayOrderId: session.razorpayOrderId },
    });
    check(
      'B1 failed session is not settled',
      settled === null,
      `returned ${settled === null ? 'null' : 'an order'}`,
    );
    check(
      'B2 failed payment dispatches nothing',
      dispatchCount() === 0 && rows === 0,
      `dispatch attempts=${dispatchCount()}, order rows=${rows}`,
    );
  }

  /* ── D: COD still notifies through POST /api/orders ────────────────── */
  {
    const orderNumber = `${TAG}_COD_${Date.now()}`;
    logBuffer = [];
    const response = await postOrder(
      new Request('http://localhost/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId: process.env.TESTFLOW_USER_ID,
          orderNumber,
          status: 'pending',
          subtotal: 1,
          discount: 0,
          shipping: 0,
          tax: 0,
          total: 1,
          paymentMethod: 'cod',
          address: { line1: `${TAG} cod street`, city: TAG },
          notes: `${TAG} cod harness`,
          items: [
            { name: `${TAG} cod item`, unitPrice: 1, quantity: 1, total: 1 },
          ],
          hasFood: false,
        }),
      }) as never,
    );
    const json: any = await response.json();
    if (json?.id) createdOrders.push(String(json.id));
    check(
      'D1 COD order created unpaid/pending, not via settlement',
      response.status === 201 && json?.payment_status === 'pending',
      `status=${response.status} payment_status=${json?.payment_status}`,
    );
    // POST /api/orders dispatches COD notifications from a fire-and-forget
    // promise chain, so give that side branch time to run before counting.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    check(
      'D2 COD notification still dispatched',
      dispatchCount() === 1,
      `dispatch attempts=${dispatchCount()} (expect 1)`,
    );
  }

  const cleanup = await purgeTestData();
  const failures = results.filter((r) => !r.ok);
  realLog(
    `\n=== ${results.length - failures.length}/${results.length} assertions passed ===`,
  );
  realLog(`=== cleanup: ${cleanup} ===`);
  if (failures.length > 0) process.exitCode = 1;
}

async function purgeTestData() {
  const testOrders = await prisma.order.findMany({
    where: {
      OR: [
        { razorpayOrderId: { startsWith: TAG } },
        { notes: { startsWith: TAG } },
        { orderNumber: { startsWith: TAG } },
      ],
    },
    select: { id: true },
  });
  const ids = Array.from(new Set([...createdOrders, ...testOrders.map((o) => o.id)]));
  if (ids.length > 0) {
    await prisma.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    await prisma.order.deleteMany({ where: { id: { in: ids } } });
  }
  const sessions = await prisma.paymentSession.deleteMany({
    where: { razorpayOrderId: { startsWith: TAG } },
  });
  const leftover = await prisma.order.count({
    where: {
      OR: [
        { razorpayOrderId: { startsWith: TAG } },
        { notes: { startsWith: TAG } },
        { orderNumber: { startsWith: TAG } },
      ],
    },
  });
  return `deleted ${sessions.count} payment sessions + ${ids.length} orders; ${leftover} leftover test orders`;
}

main()
  .catch((err) => {
    realLog('HARNESS ERROR:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
