import { notFound } from 'next/navigation';
import { StoreShell } from '@/components/store/store-shell';
import { CategoryProductsClient } from '@/components/store/category-products-client';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma/client';

export const revalidate = 60;

const FOOD_CATEGORIES = [
  { value: 'momos', label: 'Momos' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'maggi', label: 'Maggi' },
  { value: 'sandwiches', label: 'Sandwiches' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'dinner_special_menu', label: 'Dinner Special' },
];

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

async function getAvailableProductCategories(productType?: string) {
  if (!productType) return new Set<string>();
  const rows = await prisma.product.findMany({
    where: { isActive: true, productType },
    select: { productCategory: true },
    distinct: ['productCategory'],
  });
  return new Set(rows.map((r) => r.productCategory).filter((c): c is string => !!c));
}

async function filterCategoriesByAvailability(
  categories: { value: string; label: string }[],
  productType?: string
) {
  if (!productType || categories.length === 0) return categories;
  const available = await getAvailableProductCategories(productType);
  return categories.filter((c) => available.has(c.value));
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

  const productType = isNaturalCategory ? 'natural' : isGeneralCategory ? 'general' : isPujaSamagriCategory ? 'puja_samagri' : 'food';
  const allProductCategories = isNaturalCategory ? NATURAL_PRODUCT_CATEGORIES : isGeneralCategory ? GENERAL_PRODUCT_CATEGORIES : isPujaSamagriCategory ? PUJA_SAMAGRI_CATEGORIES : FOOD_CATEGORIES;
  const productCategories = allProductCategories ? await filterCategoriesByAvailability(allProductCategories, productType) : undefined;

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-3 sm:py-6">
        <CategoryProductsClient
          title={category.name}
          description={category.description ?? undefined}
          isFood={isFoodCategory}
          productType={productType}
          productCategories={productCategories}
          genderOptions={isGeneralCategory ? GENERAL_GENDER_OPTIONS : undefined}
          showBrands={isGeneralCategory}
          filters={filters}
          searchParams={sp}
        />
      </div>
    </StoreShell>
  );
}
