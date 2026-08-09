import { StoreShell } from '@/components/store/store-shell';
import { ShopClient } from '@/components/store/shop-client';
import { ZeroChargesBanner } from '@/components/store/zero-charges-banner';
import { createServerSupabase } from '@/lib/supabase/server';

export const revalidate = 60;

async function getFilters() {
  const supabase = createServerSupabase();
  const [categories, brands] = await Promise.all([
    supabase.from('categories').select('id, name, slug').eq('is_active', true).order('sort_order'),
    supabase.from('brands').select('id, name, slug').order('name'),
  ]);
  return {
    categories: categories.data ?? [],
    brands: brands.data ?? [],
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { [k: string]: string | string[] | undefined };
}) {
  const filters = await getFilters();
  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl pt-6 -mb-6">
        <ZeroChargesBanner />
      </div>
      <ShopClient filters={filters} searchParams={searchParams} />
    </StoreShell>
  );
}
