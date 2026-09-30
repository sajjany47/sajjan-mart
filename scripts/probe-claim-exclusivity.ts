/**
 * Probe: was the pre-fix session claim actually exclusive?
 *
 * Runs ONLY against throwaway payment_sessions rows (no orders are created, so
 * no mail or push can fire) and deletes them at the end.
 *
 *   npx dotenv -e .env.development -- npx tsx scripts/probe-claim-exclusivity.ts
 */

import { prisma } from '@/lib/prisma/client';

const TAG = 'TESTCLAIM';

async function seed() {
  return prisma.paymentSession.create({
    data: {
      razorpayOrderId: `${TAG}_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
      userId: null,
      status: 'pending',
      payload: {},
    },
  });
}

async function claim(id: string, where: Record<string, unknown>) {
  return prisma.paymentSession.updateMany({ where: { id, ...where }, data: { status: 'processing' } });
}

async function main() {
  const old = await seed();
  // Pre-fix predicate: `orderId: null` only.
  const a1 = await claim(old.id, { orderId: null });
  const a2 = await claim(old.id, { orderId: null });
  console.log(
    `OLD predicate  claim#1 count=${a1.count}  claim#2 count=${a2.count}  -> ${
      a1.count === 1 && a2.count === 1 ? 'BOTH WON (not exclusive)' : 'exclusive'
    }`,
  );

  const fixed = await seed();
  // Post-fix predicate: pending -> processing, or reclaim a stale processing row.
  const b1 = await prisma.paymentSession.updateMany({
    where: {
      id: fixed.id,
      orderId: null,
      OR: [
        { status: 'pending' },
        { status: 'processing', updatedAt: { lt: new Date(Date.now() - 120_000) } },
      ],
    },
    data: { status: 'processing' },
  });
  const b2 = await prisma.paymentSession.updateMany({
    where: {
      id: fixed.id,
      orderId: null,
      OR: [
        { status: 'pending' },
        { status: 'processing', updatedAt: { lt: new Date(Date.now() - 120_000) } },
      ],
    },
    data: { status: 'processing' },
  });
  console.log(
    `NEW predicate  claim#1 count=${b1.count}  claim#2 count=${b2.count}  -> ${
      b1.count === 1 && b2.count === 0 ? 'exactly one winner' : 'NOT exclusive'
    }`,
  );

  const purged = await prisma.paymentSession.deleteMany({
    where: { razorpayOrderId: { startsWith: TAG } },
  });
  console.log(`cleanup: deleted ${purged.count} probe sessions`);
}

main()
  .catch((e) => {
    console.error('PROBE ERROR:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
