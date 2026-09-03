/**
 * Client-safe types + pure helpers shared by the puja Excel import flow.
 *
 * This module must stay free of server-only imports (Prisma, ExcelJS, Node
 * buffers) because it is imported by client components (the import wizard).
 */

export const PUJA_CHIP_LABELS: Array<[string, string]> = [
  ['coconut_nariyal', 'Coconut (Nariyal)'],
  ['agarbatti', 'Agarbatti (Incense)'],
  ['camphor_kapur', 'Camphor (Kapur)'],
  ['deep_diya', 'Deep (Diya)'],
  ['kapor_vastra', 'Kapor (Vastra)'],
  ['fool_flowers', 'Fool (Flowers)'],
  ['gamcha', 'Gamcha'],
  ['ghee', 'Ghee'],
  ['rice_akshat', 'Rice (Akshat)'],
  ['kalash', 'Kalash'],
  ['betel_leaf', 'Betel Leaf (Paan)'],
  ['fruits_fal', 'Fruits (Fal)'],
  ['roli_kumkum', 'Roli & Kumkum'],
  ['haldi', 'Haldi (Turmeric)'],
  ['chandan', 'Chandan (Sandalwood)'],
  ['supari', 'Supari (Betel Nut)'],
  ['elaichi', 'Elaichi (Cardamom)'],
  ['ganga_jal', 'Ganga Jal'],
  ['moli_kalava', 'Moli (Kalava)'],
  ['bel_patra', 'Bel Patra'],
  ['other', 'Other'],
];

export function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const CHIP_BY_SLUG: Record<string, string> = {};
const CHIP_BY_NORMALIZED_LABEL: Record<string, string> = {};
for (const [slug, label] of PUJA_CHIP_LABELS) {
  CHIP_BY_SLUG[slug] = slug;
  CHIP_BY_NORMALIZED_LABEL[normalizeLabel(label)] = slug;
}

export interface ParsedPujaItem {
  name: string;
  price?: number;
  purchasePrice?: number;
  description?: string;
  imageUrls: string[];
  chip?: string;
  isActive?: boolean;
  warnings?: string[];
}

export interface ParsedPujaEntry {
  name: string;
  qty: number;
}

export interface ParsedPuja {
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  entries: ParsedPujaEntry[];
  warnings?: string[];
}

export interface PujaImportSummary {
  itemRows: number;
  itemsCreated: number;
  itemsUpdated: number;
  imagesAdded: number;
  pujaRows: number;
  pujasCreated: number;
  pujasUpdated: number;
  linksCreated: number;
  warnings: string[];
}

export interface ChipOption {
  slug: string;
  label: string;
}

export function parseBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return undefined;
  if (['yes', 'true', '1', 'active', 'enabled', 'y', 'on'].includes(s)) return true;
  if (['no', 'false', '0', 'inactive', 'disabled', 'n', 'off'].includes(s)) return false;
  return undefined;
}

export function parseNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  const cleaned = s.replace(/[^0-9.-]/g, '');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
}

export function splitImageUrls(v: unknown): string[] {
  if (v === null || v === undefined) return [];
  return String(v)
    .split(/[\n,;|]+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//i.test(u) || u.startsWith('/'));
}

export function parseItemsCell(v: unknown): ParsedPujaEntry[] {
  if (v === null || v === undefined) return [];
  const parts = String(v)
    .split(/[\n,;|•]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const entries: ParsedPujaEntry[] = [];
  for (const part of parts) {
    // "2 x Coconut" | "Coconut x 2" | "Coconut"
    let qty = 1;
    let name = part;
    let m = part.match(/^(\d+(?:\.\d+)?)\s*[xX×*]\s*(.+)$/);
    if (m) {
      qty = Math.max(1, Math.round(parseFloat(m[1])));
      name = m[2].trim();
    } else {
      m = part.match(/^(.+?)\s*[xX×*]\s*(\d+(?:\.\d+)?)$/);
      if (m) {
        qty = Math.max(1, Math.round(parseFloat(m[2])));
        name = m[1].trim();
      }
    }
    if (name) entries.push({ name, qty });
  }
  return entries;
}

export function resolveChip(v: unknown): { slug?: string; note?: string } {
  if (v === null || v === undefined) return {};
  const raw = String(v).trim();
  if (!raw) return {};
  const normalized = normalizeLabel(raw);
  if (CHIP_BY_SLUG[raw]) return { slug: raw };
  if (CHIP_BY_SLUG[normalized]) return { slug: normalized };
  const byLabel = CHIP_BY_NORMALIZED_LABEL[normalized];
  if (byLabel) return { slug: byLabel };
  return { note: `Unrecognized category "${raw}" -> Other` };
}
