import Image from 'next/image';
import Link from 'next/link';
import { Search, Clock, Star } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { ZeroChargesBanner } from '@/components/store/zero-charges-banner';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatINR } from '@/lib/format';
import type { Puja, PujaItem } from '@/lib/types';

export const revalidate = 60;

async function getPujas() {
  const supabase = createServerSupabase();
  const { data } = await supabase.from('pujas').select('*').eq('is_active', true).order('name');
  const pujas = (data ?? []) as Puja[];
  const ids = pujas.map((p) => p.id);
  const { data: items } = ids.length > 0
    ? await supabase.from('puja_items').select('*').in('puja_id', ids).order('sort_order')
    : { data: [] };
  const byPuja: Record<string, PujaItem[]> = {};
  for (const it of (items ?? []) as PujaItem[]) {
    (byPuja[it.puja_id] = byPuja[it.puja_id] ?? []).push(it);
  }
  return pujas.map((p) => ({ ...p, items: byPuja[p.id] ?? [] }));
}

export default async function PujaPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const pujas = await getPujas();
  const q = (searchParams.q ?? '').toLowerCase().trim();
  const filtered = q ? pujas.filter((p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)) : pujas;

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <ZeroChargesBanner />
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/70 p-8 text-primary-foreground">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Puja Samagri</h1>
          <p className="mt-2 text-primary-foreground/80">
            Book a complete puja package - pandit + all required samagri, delivered to your door.
          </p>
          <form className="mt-4 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search pujas - Satyanarayan, Durga, Lakshmi..."
                className="w-full rounded-lg border-0 bg-background/95 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </form>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/puja/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-lg"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                {p.image_url && (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                {p.items.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.items.slice(0, 6).map((it) => (
                      <span key={it.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{it.name}</span>
                    ))}
                    {p.items.length > 6 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">+{p.items.length - 6} more</span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-semibold">{formatINR(p.base_price)}</span>
                  <span className="text-xs text-muted-foreground">Pandit + Samagri</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-12 text-center text-muted-foreground">
            No pujas found matching &quot;{q}&quot;.
          </div>
        )}
      </div>
    </StoreShell>
  );
}
