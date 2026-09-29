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
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

async function getPujaData(_pujaId: string) {
  const supabase = createServerSupabase();
  const [items, pandits] = await Promise.all([
    supabase.from('puja_items').select('*').eq('puja_id', _pujaId).order('sort_order'),
    supabase.from('pandits').select('*').eq('is_active', true).order('name'),
  ]);
  const pujaItems = (items.data ?? []) as any[];

  // Attach each item's product thumbnail (puja_items.product_id → product_images). Display only — no logic change.
  const productIds: string[] = [];
  for (const item of pujaItems) {
    if (item.product_id && !productIds.includes(item.product_id)) {
      productIds.push(item.product_id);
    }
  }
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, product_images(url, sort_order)')
      .in('id', productIds);
    const imageByProduct = new Map<string, string>();
    for (const p of products ?? []) {
      const images = ((p as any).product_images ?? []) as { url: string; sort_order: number | null }[];
      if (images.length > 0) {
        const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        imageByProduct.set((p as any).id, sorted[0].url);
      }
    }
    for (const item of pujaItems) {
      item.image = item.product_id ? imageByProduct.get(item.product_id) ?? null : null;
    }
  }

  return {
    items: pujaItems,
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
