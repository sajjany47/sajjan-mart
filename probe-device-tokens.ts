/**
 * Throwaway probe — deleted after the run.
 *
 * READ-ONLY. Reports DeviceToken rows with the token itself reduced to a length,
 * so the report can say whether a token was registered and marked active
 * without exposing it.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.deviceToken.findMany({
    select: {
      id: true,
      userId: true,
      platform: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      token: true,
      user: { select: { role: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  console.log(`device-token rows (newest first, max 20): ${rows.length}`);
  for (const row of rows) {
    console.log(
      [
        `id=${row.id}`,
        `userRole=${row.user?.role ?? 'none'}`,
        `active=${row.isActive}`,
        `platform=${row.platform}`,
        `tokenLength=${row.token.length}`,
        `updated=${row.updatedAt.toISOString()}`,
        `created=${row.createdAt.toISOString()}`,
      ].join(' '),
    );
  }

  const activeAdmin = await prisma.deviceToken.count({
    where: { isActive: true, user: { role: 'admin' } },
  });
  console.log(`active admin tokens (the fan-out filter): ${activeAdmin}`);
}

main()
  .catch(err => console.error('probe failed:', err instanceof Error ? err.message : err))
  .finally(() => prisma.$disconnect());
