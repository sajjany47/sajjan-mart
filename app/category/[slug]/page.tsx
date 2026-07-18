import { notFound } from 'next/navigation';
import { StoreShell } from '@/components/store/store-shell';
import { ShopClient } from '@/components/store/shop-client';
import { createServerSupabase } from '@/lib/supabase/server';

export const revalidate = 60;

async function getFilters() {
  const supabase = createServerSupabase();
  const [categories, brands] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('sort_order'),
    supabase.from('brands').select('id, name, slug').order('name'),
  ]);
  return { categories: categories.data ?? [], brands: brands.data ?? [] };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const supabase = createServerSupabase();
  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!category) notFound();

  const filters = await getFilters();
  const sp = { ...searchParams, category: params.slug };

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary/10 to-accent p-6">
          <h1 className="font-display text-3xl font-semibold">{category.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
        </div>
        <ShopClient filters={filters} searchParams={sp} />
      </div>
    </StoreShell>
  );
}
