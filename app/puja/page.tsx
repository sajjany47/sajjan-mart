import { Sparkles, Star, ShieldCheck } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { PujaListClient } from '@/components/store/puja-list-client';
import { createServerSupabase } from '@/lib/supabase/server';
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

export default async function PujaPage() {
  const pujas = await getPujas();

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-5">
        {/* Hero Banner */}
        <div className="relative -mx-4 overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 px-5 py-5 shadow-sm sm:-mx-0 sm:rounded-2xl sm:px-6 sm:py-6 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-rose-950/20 dark:border-amber-900/30">
          <div className="absolute inset-0 bg-[url('/images/banners/puja_pandit_banner.jpg')] bg-cover bg-center opacity-[0.07] mix-blend-multiply" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">Puja Samagri</h1>
              <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-sm">
                Complete puja packages with verified Vedic Pandit Ji booking
              </p>
            </div>
          </div>
          <div className="relative z-10 mt-3 flex items-center gap-3 border-t border-amber-200/50 pt-3 text-[11px] text-muted-foreground dark:border-amber-900/30 sm:text-xs sm:gap-4">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified Pandit Ji</span>
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Complete Samagri</span>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">0% Extra</span>
          </div>
        </div>

        <PujaListClient pujas={pujas} />
      </div>
    </StoreShell>
  );
}
