/**
 * Multi-device order-decision test harness.
 *
 * Proves the atomic pending -> accepted/rejected transition (exactly one device
 * wins, the other gets 409 + the live status), the ORDER_STATUS_UPDATED event
 * contract, and the admin-token recipient rule.
 *
 *   npx dotenv -e .env.development -- npx tsx scripts/test-order-decision-race.ts
 *
 * Side-effect safety (the dev env holds REAL Firebase + SMTP credentials and
 * dev/prod share one Neon database):
 *   - FIREBASE_* and SMTP_* are deleted from process.env before anything runs,
 *     so getFirebaseMessaging() and getTransporter() both return null and no
 *     push or mail can leave the process. Dispatch attempts are counted from
 *     their "not available — skipping" log lines instead.
 *   - Every row is tagged TESTSYNC and deleted in the finally block.
 *   - Orders stay paymentStatus 'pending', so no Razorpay refund is attempted.
 */

for (const key of Object.keys(process.env)) {
  if (/^FIREBASE_/i.test(key) || /^SMTP_/i.test(key)) delete process.env[key];
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { PUT } from '@/app/api/orders/[id]/route';
import { signAccessToken } from '@/lib/jwt';
import {
  buildEventId,
  buildNewOrderData,
  buildOrderStatusUpdatedData,
} from '@/lib/notifications';

const TAG = 'TESTSYNC';
const ADMIN = { id: `${TAG}-admin`, email: `${TAG}-admin@example.invalid`, role: 'admin' };

let passed = 0;
let failed = 0;

/** Harness output goes straight to the real stdout. */
function out(...args: unknown[]): void {
  realLog(...args);
}

function check(label: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    out(`  PASS  ${label}`);
  } else {
    failed++;
    out(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

/* ── Log capture: the app's logs are recorded, not printed ──────────── *
 * The dispatch counter reads these lines, because Firebase is disabled. */
const captured: string[] = [];
const realLog = console.log.bind(console);

function record(...args: unknown[]): void {
  captured.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
}

console.log = record;
console.warn = record;
console.error = record;

function dispatchCount(eventType: string): number {
  return captured.filter((l) => l.includes(`skipping ${eventType} push`)).length;
}

/** The announcement is fire-and-forget; give it time to reach the counter. */
async function settleAsync(ms = 400): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function adminRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/orders/x', {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${signAccessToken(ADMIN)}`,
    },
    body: JSON.stringify(body),
  });
}

function put(orderId: string, body: Record<string, unknown>) {
  return PUT(adminRequest(body), { params: { id: orderId } });
}

async function makePendingOrder(label: string, status = 'pending') {
  const stamp = `${TAG}_${label}_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
  const customer = await prisma.profile.create({
    data: { email: `${stamp}@example.invalid`, fullName: `${stamp} customer`, role: 'customer' },
  });
  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: stamp,
      status,
      total: 250,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      address: { line1: 'Test street', city: 'Test city' },
      items: {
        create: [
          { name: `${stamp} item A`, quantity: 1, unitPrice: 150, total: 150 },
          { name: `${stamp} item B`, quantity: 1, unitPrice: 100, total: 100 },
        ],
      },
    },
  });
  return { order, customer };
}

async function statusOf(id: string) {
  return prisma.order.findUnique({ where: { id }, select: { status: true } });
}

async function main() {
  out(`firebase/smtp env stripped: ${process.env.FIREBASE_PROJECT_ID === undefined && process.env.SMTP_HOST === undefined}`);

  /* ── 1. Event payload contract ───────────────────────────────────── */
  out('\n1) Notification payload contract');
  {
    const newOrder = buildNewOrderData(
      { id: 'o-1', orderNumber: 'SM1', total: 250, paymentMethod: 'cod', paymentStatus: 'pending', address: { city: 'X' } },
      [{ id: 'i1', name: 'A', quantity: 2, unitPrice: 100, total: 200 }],
      { fullName: 'Asha', phone: '999' },
    );
    check('NEW_ORDER carries eventType', newOrder.eventType === 'NEW_ORDER');
    check('NEW_ORDER carries orderId', newOrder.orderId === 'o-1');
    check('NEW_ORDER carries a unique eventId', newOrder.eventId === buildEventId('NEW_ORDER', 'o-1'));
    check('NEW_ORDER keeps the legacy type key for installed builds', newOrder.type === 'NEW_ORDER');
    check(
      'every NEW_ORDER data value is a string (FCM requirement)',
      Object.values(newOrder).every((v) => typeof v === 'string'),
      Object.entries(newOrder).filter(([, v]) => typeof v !== 'string').map(([k]) => k).join(','),
    );

    const accepted = buildOrderStatusUpdatedData({ id: 'o-1', orderNumber: 'SM1', status: 'confirmed' });
    const rejected = buildOrderStatusUpdatedData({ id: 'o-1', orderNumber: 'SM1', status: 'cancelled' });
    check('status event carries eventType ORDER_STATUS_UPDATED', accepted.eventType === 'ORDER_STATUS_UPDATED');
    check('accept maps to status ACCEPTED', accepted.status === 'ACCEPTED', accepted.status);
    check('reject maps to status REJECTED', rejected.status === 'REJECTED', rejected.status);
    check('status event carries orderId', accepted.orderId === 'o-1');
    check('eventId is deterministic (a redelivery dedupes)', accepted.eventId === buildOrderStatusUpdatedData({ id: 'o-1', orderNumber: 'SM1', status: 'confirmed' }).eventId);
    check('accept and reject get different eventIds', accepted.eventId !== rejected.eventId);
    check('different orders get different eventIds', accepted.eventId !== buildOrderStatusUpdatedData({ id: 'o-2', orderNumber: 'SM2', status: 'confirmed' }).eventId);
  }

  /* ── 2. Recipient rule: active admin tokens only ─────────────────── */
  out('\n2) Recipient selection (rule unchanged: isActive + role admin)');
  {
    const stamp = `${TAG}_tokens_${Date.now()}`;
    const adminProfile = await prisma.profile.create({
      data: { email: `${stamp}@example.invalid`, fullName: `${stamp} admin`, role: 'admin' },
    });
    const customerProfile = await prisma.profile.create({
      data: { email: `${stamp}-c@example.invalid`, fullName: `${stamp} cust`, role: 'customer' },
    });
    const mk = (userId: string, token: string, isActive: boolean) =>
      prisma.deviceToken.create({ data: { userId, token, platform: 'android', isActive } });
    await mk(adminProfile.id, `${stamp}-active`, true);
    await mk(adminProfile.id, `${stamp}-inactive`, false);
    await mk(customerProfile.id, `${stamp}-customer`, true);

    const selected = await prisma.deviceToken.findMany({
      where: { isActive: true, user: { role: 'admin' } },
      select: { token: true },
    });
    const mine = selected.map((t) => t.token).filter((t) => t.startsWith(stamp));
    check('active admin token is selected', mine.includes(`${stamp}-active`));
    check('inactive admin token is excluded', !mine.includes(`${stamp}-inactive`), mine.join(','));
    check('customer token is excluded', !mine.includes(`${stamp}-customer`), mine.join(','));
    check('real admin devices are still in the pool', selected.length > mine.length);
  }

  /* ── 3. Simultaneous accept vs reject — exactly one wins ─────────── */
  out('\n3) Two devices decide at the same time (D)');
  {
    const { order } = await makePendingOrder('race');
    const before = dispatchCount('ORDER_STATUS_UPDATED');

    const [a, b] = await Promise.all([put(order.id, { status: 'confirmed' }), put(order.id, { status: 'cancelled' })]);
    await settleAsync();

    const codes = [a.status, b.status].sort();
    check('exactly one 2xx and one 409', codes[0] === 200 && codes[1] === 409, codes.join(','));

    const winner = a.ok ? a : b;
    const loser = a.ok ? b : a;
    const winnerStatus = a.ok ? 'confirmed' : 'cancelled';
    const final = await statusOf(order.id);
    check(`the winner's decision persisted (${winnerStatus})`, final?.status === winnerStatus, `db=${final?.status}`);

    const loserBody = await loser.json();
    check('409 body reports the live status', loserBody.status === winnerStatus, JSON.stringify(loserBody.status));
    check('409 body says another device handled it', loserBody.error === 'ORDER_ALREADY_PROCESSED', String(loserBody.error));
    check('409 does not overwrite the decision', (await statusOf(order.id))?.status === winnerStatus);

    const announced = dispatchCount('ORDER_STATUS_UPDATED') - before;
    check('exactly one ORDER_STATUS_UPDATED announcement for the race', announced === 1, `count=${announced}`);
    check(
      'the announcement matches the winner',
      captured.some((l) => l.includes(`skipping ORDER_STATUS_UPDATED push for order ${order.orderNumber} -> ${winnerStatus === 'confirmed' ? 'ACCEPTED' : 'REJECTED'}`)),
    );

    /* ── 3b. Replay after the order has left pending ───────────────── *
     * The latch only guards the pending -> decision transition, which is the
     * race the spec is about. Once the order is no longer pending, repeating
     * the SAME decision is an idempotent no-op write: it must not re-announce
     * and must not move the row. (Cancelling an already-accepted order stays
     * the store's normal reject flow — see report.) */
    const replay = await put(order.id, { status: winnerStatus });
    await settleAsync();
    check('repeating the winning decision on a processed order changes nothing', (await statusOf(order.id))?.status === winnerStatus);
    check('a repeat announces nothing new', dispatchCount('ORDER_STATUS_UPDATED') - before === 1);
    check('a repeat is not treated as a second decision', replay.status === 200, `got ${replay.status}`);

    const winnerBody = await winner.json();
    check('the winning response returns the decided order', winnerBody.status === winnerStatus, String(winnerBody.status));
  }

  /* ── 4. Reject, then a stale device tries to accept ──────────────── */
  out('\n4) Reject, then a stale device tries to accept');
  {
    const { order } = await makePendingOrder('reject-then-accept');
    const rejected = await put(order.id, { status: 'cancelled' });
    await settleAsync();
    check('reject on a pending order succeeds', rejected.status === 200, `got ${rejected.status}`);
    check('order is now cancelled', (await statusOf(order.id))?.status === 'cancelled');
    const beforeLate = dispatchCount('ORDER_STATUS_UPDATED');

    const lateAccept = await put(order.id, { status: 'confirmed' });
    await settleAsync();
    const lateBody = await lateAccept.json();
    check('a late accept cannot resurrect a rejected order (409)', lateAccept.status === 409, `got ${lateAccept.status}`);
    check('that 409 reports status cancelled', lateBody.status === 'cancelled', String(lateBody.status));
    check('the row still says cancelled', (await statusOf(order.id))?.status === 'cancelled');
    check('the refused accept announces nothing', dispatchCount('ORDER_STATUS_UPDATED') - beforeLate === 0);
  }

  /* ── 4b. Accept, then the store's normal cancel flow ─────────────── */
  out('\n4b) Accept then a late reject from another phone');
  {
    const { order } = await makePendingOrder('accept');
    const first = await put(order.id, { status: 'confirmed' });
    await settleAsync();
    check('accept on a pending order succeeds', first.status === 200, `got ${first.status}`);
    check('order is now confirmed', (await statusOf(order.id))?.status === 'confirmed');

    const late = await put(order.id, { status: 'cancelled' });
    await settleAsync();
    check('a confirmed order can still be cancelled (unchanged behaviour)', late.status === 200, `got ${late.status}`);
    check('cancelling from confirmed settles the items', (await prisma.orderItem.count({ where: { orderId: order.id, cancelled: true } })) === 2);
  }

  /* ── 5. Unrelated transitions must be untouched ─────────────────── */
  out('\n5) Other status transitions are unaffected');
  {
    const { order } = await makePendingOrder('flow', 'confirmed');
    const shipped = await put(order.id, { status: 'shipped' });
    await settleAsync();
    check('confirmed -> shipped still 200', shipped.status === 200, `got ${shipped.status}`);
    check('no ORDER_STATUS_UPDATED for a non-decision transition', !captured.some((l) => l.includes(`-> SHIPPED`)));

    const delivered = await put(order.id, { status: 'delivered' });
    check('shipped -> delivered still 200', delivered.status === 200, `got ${delivered.status}`);

    const unauthed = await PUT(
      new NextRequest('http://localhost/api/orders/x', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${signAccessToken({ id: ADMIN.id, email: ADMIN.email, role: 'customer' })}`,
        },
        body: JSON.stringify({ status: 'confirmed' }),
      }),
      { params: { id: order.id } },
    );
    check('a non-admin cannot decide (403, auth unchanged)', unauthed.status === 403, `got ${unauthed.status}`);
    check('the rejected attempt did not move the order', (await statusOf(order.id))?.status === 'delivered');
  }

  /* ── 6. No real push or mail left the process ────────────────────── */
  out('\n6) Side-effect guard');
  {
    check('no FCM send was attempted with credentials', !captured.some((l) => l.includes('FCM ') && l.includes('send completed')));
    check('mail was skipped, not sent', captured.some((l) => l.includes('SMTP not configured')));
    check('no mail transport ran', !captured.some((l) => l.includes('[mailer] Sent')));
  }

  out(`\nRESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    realLog('HARNESS ERROR:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Orders cascade their items; tokens cascade with the profile.
    const items = await prisma.order.deleteMany({ where: { orderNumber: { startsWith: TAG } } });
    const tokens = await prisma.deviceToken.deleteMany({ where: { token: { startsWith: TAG } } });
    const profiles = await prisma.profile.deleteMany({ where: { email: { startsWith: TAG } } });
    realLog(`cleanup: orders=${items.count} tokens=${tokens.count} profiles=${profiles.count}`);
    await prisma.$disconnect();
  });
