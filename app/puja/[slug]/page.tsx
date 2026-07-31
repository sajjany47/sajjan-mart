import { notFound } from 'next/navigation';
import { StoreShell } from '@/components/store/store-shell';
import { PujaDetailClient } from '@/components/store/puja-detail-client';
import { createServerSupabase } from '@/lib/supabase/server';

export const revalidate = 60;

async function getPuja(slug: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('pujas')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

async function getPujaData(_pujaId: string) {
  const supabase = createServerSupabase();
  const [items, pandits] = await Promise.all([
    supabase.from('puja_items').select('*').eq('puja_id', _pujaId).order('sort_order'),
    supabase.from('pandits').select('*').eq('is_active', true).order('name'),
  ]);
  return {
    items: items.data ?? [],
    pandits: (pandits.data ?? []),
  };
}

export default async function PujaDetailPage({ params }: { params: { slug: string } }) {
  const puja = await getPuja(params.slug);
  if (!puja) notFound();
  const { items, pandits } = await getPujaData(puja.id);

  return (
    <StoreShell>
      <PujaDetailClient puja={puja} items={items as any[]} pandits={pandits as any[]} />
    </StoreShell>
  );
}
