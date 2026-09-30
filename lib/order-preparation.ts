import type { Order } from '@prisma/client';

/**
 * The frozen result of the kitchen's preparation, derived from the three
 * instants this server stamped itself (`accepted_at`, `preparation_due_at`,
 * `prepared_at`).
 *
 * It is computed here and returned with the order so that every device shows
 * the same numbers: the vendor app must never measure the kitchen against its
 * own clock, its own cache, or the making time the vendor happened to select.
 */
export interface PreparationSummary {
  /** `accepted_at` → `prepared_at`, to the second. */
  actualSeconds: number;
  /** `preparation_due_at` → `prepared_at`, or null when finished on time. */
  lateSeconds: number | null;
}

/**
 * The exact difference, truncated to whole seconds.
 *
 * Minutes were dropped on purpose: rounding a part-minute up reported a 1 minute
 * order finished 5 seconds late as "Late by 1 min", and rounding it down denied
 * the lateness altogether. Neither is the truth, and a 45 second kitchen is a
 * fact the vendor needs to see.
 */
function secondsBetween(
  from: Date | null | undefined,
  to: Date | null | undefined
): number | null {
  if (!from || !to) return null;
  const ms = to.getTime() - from.getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / 1000);
}

/**
 * Null unless both ends of the preparation exist — including for no row at all
 * — so an order that finished before `prepared_at` was introduced shows no
 * duration rather than an invented one. Lateness never falls back to
 * `preparation_time_minutes`: the deadline is the only thing that can make an
 * order late.
 */
export function computePreparationSummary(
  order: Pick<Order, 'acceptedAt' | 'preparationDueAt' | 'preparedAt'> | null
): PreparationSummary | null {
  if (!order) return null;
  const actualSeconds = secondsBetween(order.acceptedAt, order.preparedAt);
  if (actualSeconds === null) return null;
  const overdue = secondsBetween(order.preparationDueAt, order.preparedAt);
  return { actualSeconds, lateSeconds: overdue ? overdue : null };
}
