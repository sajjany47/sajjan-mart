import type { Puja } from '@/lib/types';

// Birthday & Marriage Anniversary recur every month, so they stay pinned on top.
export const MONTHLY_PUJA_SLUGS = ['marriage-anniversary', 'birthday'];

// The store serves Kolkata; IST is UTC+5:30.
export function todayInIST(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Prisma returns DateTime columns as Date objects on the server, while API/JSON
// payloads carry ISO strings — accept both and reduce to a YYYY-MM-DD key.
export function pujaDayKey(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export type PujaDateStatus = 'monthly' | 'today' | 'upcoming' | 'undated' | 'past';

export function pujaDateStatus(puja: Puja, today = todayInIST()): PujaDateStatus {
  if (MONTHLY_PUJA_SLUGS.includes(puja.slug)) return 'monthly';
  const day = pujaDayKey(puja.puja_date);
  if (!day) return 'undated';
  if (day === today) return 'today';
  return day > today ? 'upcoming' : 'past';
}

const TIER: Record<PujaDateStatus, number> = {
  monthly: 0,
  today: 1,
  upcoming: 2,
  undated: 3,
  past: 4,
};

// Storefront order: monthly events → today → upcoming (soonest first) →
// undated → past (most recent first).
export function sortPujasForStorefront<T extends Puja>(pujas: T[]): T[] {
  const today = todayInIST();
  return [...pujas].sort((a, b) => {
    const ta = TIER[pujaDateStatus(a, today)];
    const tb = TIER[pujaDateStatus(b, today)];
    if (ta !== tb) return ta - tb;
    if (ta === 0) {
      return MONTHLY_PUJA_SLUGS.indexOf(a.slug) - MONTHLY_PUJA_SLUGS.indexOf(b.slug);
    }
    const da = pujaDayKey(a.puja_date) ?? '';
    const db = pujaDayKey(b.puja_date) ?? '';
    if (ta === 1 || ta === 2) return da.localeCompare(db);
    if (ta === 4) return db.localeCompare(da);
    return a.name.localeCompare(b.name);
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPujaDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
