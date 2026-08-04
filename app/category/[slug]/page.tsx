import { notFound } from 'next/navigation';
import { StoreShell } from '@/components/store/store-shell';
import { ShopClient } from '@/components/store/shop-client';
import { FoodShopClient } from '@/components/store/food-shop-client';
import { createServerSupabase } from '@/lib/supabase/server';

export const revalidate = 60;

const NATURAL_PRODUCT_CATEGORIES = [
  { value: 'fruits_vegetables', label: 'Fruits & Veg' },
  { value: 'oil_ghee', label: 'Oil & Ghee' },
  { value: 'masala_spices', label: 'Masala & Spices' },
  { value: 'noodles_pasta', label: 'Noodles & Pasta' },
  { value: 'grains_rice', label: 'Grains & Rice' },
  { value: 'dal_legumes', label: 'Dal & Legumes' },
  { value: 'honey_jaggery', label: 'Honey & Jaggery' },
  { value: 'dry_fruits', label: 'Dry Fruits' },
  { value: 'dairy_bread', label: 'Dairy & Bread' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'health_wellness', label: 'Health & Care' },
  { value: 'other', label: 'Other' },
];

const GENERAL_PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'home', label: 'Home & Kitchen' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'sports', label: 'Sports' },
  { value: 'books', label: 'Books' },
  { value: 'toys', label: 'Toys' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' },
];

const GENERAL_GENDER_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'baby', label: 'Baby' },
  { value: 'men_women_both', label: 'Men & Women' },
  { value: 'all', label: 'All' },
];

const PUJA_SAMAGRI_CATEGORIES = [
  { value: 'coconut_nariyal', label: 'Coconut (Nariyal)' },
  { value: 'agarbatti', label: 'Agarbatti (Incense)' },
  { value: 'camphor_kapur', label: 'Camphor (Kapur)' },
  { value: 'deep_diya', label: 'Deep (Diya)' },
  { value: 'kapor_vastra', label: 'Kapor (Vastra)' },
  { value: 'fool_flowers', label: 'Fool (Flowers)' },
  { value: 'gamcha', label: 'Gamcha' },
  { value: 'ghee', label: 'Ghee' },
  { value: 'rice_akshat', label: 'Rice (Akshat)' },
  { value: 'kalash', label: 'Kalash' },
  { value: 'betel_leaf', label: 'Betel Leaf (Paan)' },
  { value: 'fruits_fal', label: 'Fruits (Fal)' },
  { value: 'roli_kumkum', label: 'Roli & Kumkum' },
  { value: 'haldi', label: 'Haldi (Turmeric)' },
  { value: 'chandan', label: 'Chandan (Sandalwood)' },
  { value: 'supari', label: 'Supari (Betel Nut)' },
  { value: 'elaichi', label: 'Elaichi (Cardamom)' },
  { value: 'ganga_jal', label: 'Ganga Jal' },
  { value: 'moli_kalava', label: 'Moli (Kalava)' },
  { value: 'bel_patra', label: 'Bel Patra' },
  { value: 'other', label: 'Other' },
];

async function getFilters() {
  const supabase = createServerSupabase();
  const [categories, subCategories, brands] = await Promise.all([
    supabase.from('categories').select('id, name, slug').eq('is_active', true).order('sort_order'),
    supabase.from('sub_categories').select('id, category_id, name, slug').order('name'),
    supabase.from('brands').select('id, name, slug').order('name'),
  ]);
  return {
    categories: categories.data ?? [],
    subCategories: (subCategories.data ?? []).map((sc: any) => ({
      id: sc.id,
      name: sc.name,
      slug: sc.slug,
      categoryId: sc.category_id,
    })),
    brands: brands.data ?? [],
  };
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
    .eq('is_active', true)
    .maybeSingle();

  if (!category) notFound();

  const filters = await getFilters();
  const sp = { ...searchParams, category: params.slug };

  const isFoodCategory = params.slug === 'food';
  const isNaturalCategory = params.slug === 'natural-products';
  const isGeneralCategory = params.slug === 'general';
  const isPujaSamagriCategory = params.slug === 'puja-samagri';

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        {isFoodCategory ? (
          <FoodShopClient filters={filters} searchParams={sp} />
        ) : (
          <>
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary/10 to-accent p-6">
              <h1 className="font-display text-3xl font-semibold">{category.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
            </div>
            <ShopClient
              filters={filters}
              searchParams={sp}
              productType={isNaturalCategory || isGeneralCategory || isPujaSamagriCategory ? (isNaturalCategory ? 'natural' : isGeneralCategory ? 'general' : 'puja_samagri') : undefined}
              productCategories={isNaturalCategory ? NATURAL_PRODUCT_CATEGORIES : isGeneralCategory ? GENERAL_PRODUCT_CATEGORIES : isPujaSamagriCategory ? PUJA_SAMAGRI_CATEGORIES : undefined}
              genderOptions={isGeneralCategory ? GENERAL_GENDER_OPTIONS : undefined}
              showBrands={isGeneralCategory}
            />
          </>
        )}
      </div>
    </StoreShell>
  );
}
