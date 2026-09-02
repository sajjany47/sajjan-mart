import Link from 'next/link';
import Image from 'next/image';
import { StoreShell } from '@/components/store/store-shell';
import { HeroSlider, type Slide } from '@/components/store/hero-slider';
import { CategoryProductSection } from '@/components/store/category-product-section';
import { PujaSection } from '@/components/store/puja-section';
import { SectionHeader } from '@/components/store/section-header';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Category, Product, Puja } from '@/lib/types';

export const revalidate = 60;

const HERO_SLIDES: Slide[] = [
  {
    id: 'hero-food',
    title: 'Hot & Delicious Cloud Kitchen Food',
    subtitle:
      'Delicious momos, artisan pizzas, crispy sandwiches, maggi & breakfast prepared fresh and delivered hot.',
    image_url: '/images/banners/food_banner.jpg',
    cta_text: 'Order Hot Food',
    cta_link: '/category/food',
    sort_order: 1,
    is_active: true,
    variant: 'standard',
  },
  {
    id: 'hero-puja-pandit',
    title: 'Puja Samagri Book Karen — Sath Me Pandit Ji Bhi Book Hotey Hain!',
    subtitle:
      'Durga Puja, Chhath Puja, Diwali & 14+ Festivals ke liye complete curated Puja Samagri package + Verified Vedic Pandit Ji in 1-Click!',
    image_url: '/images/banners/puja_pandit_banner.jpg',
    cta_text: 'Book Puja & Pandit Ji',
    cta_link: '/puja',
    sort_order: 2,
    is_active: true,
    variant: 'puja_pandit',
  },
  {
    id: 'hero-natural',
    title: 'Pure Mustard Oil & Farm-Fresh Spices',
    subtitle:
      '100% Pure Cold-Pressed Mustard Oil, Haldi Powder, Garam Masala & Spices delivered fresh to your kitchen.',
    image_url: '/images/banners/natural_banner.jpg',
    cta_text: 'Shop Spices & Oils',
    cta_link: '/category/natural-products',
    sort_order: 3,
    is_active: true,
    variant: 'standard',
  },
  {
    id: 'hero-zero-charges',
    title: '₹0 GST • ₹0 PLATFORM FEES • ₹0 TAX • ZERO HIDDEN CHARGES',
    subtitle:
      'What you see is what you pay! Checkout par 1 rupee bhi extra nahi lagega. 100% Honest & Transparent Price.',
    image_url: '/images/banners/zero_charges_banner.jpg',
    cta_text: 'Shop With Zero Fees',
    cta_link: '/shop',
    sort_order: 4,
    is_active: true,
    variant: 'charges',
  },
];

const SECTION_CONFIG = [
  { type: 'food', title: 'Food', subtitle: 'Freshly prepared food from our cloud kitchen', href: '/category/food' },
  { type: 'natural', title: 'Natural Products', subtitle: 'Pure mustard oils & authentic kitchen spices', href: '/category/natural-products' },
  { type: 'general', title: 'General Products', subtitle: 'Everyday essentials for your home', href: '/category/general' },
] as const;

async function getHomeData() {
  const supabase = createServerSupabase();

  const [categoriesResult, ...productResults] = await Promise.all([
    supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
    ...SECTION_CONFIG.map((s) =>
      supabase
        .from('products')
        .select('*, product_images(*)')
        .eq('is_active', true)
        .eq('product_type', s.type)
        .order('rating', { ascending: false })
        .limit(6)
    ),
  ]);

  const productsByType: Record<string, Product[]> = {};
  SECTION_CONFIG.forEach((s, i) => {
    productsByType[s.type] = (productResults[i].data ?? []) as Product[];
  });

  const { data: pujasData } = await supabase
    .from('pujas')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .limit(6);

  return {
    categories: (categoriesResult.data ?? []) as Category[],
    productsByType,
    pujas: (pujasData ?? []) as Puja[],
  };
}

export default async function HomePage() {
  const { categories, productsByType, pujas } = await getHomeData();

  const categoryHref = (slug: string) =>
    slug === 'puja-samagri' ? '/puja' : `/category/${slug}`;

  return (
    <StoreShell>
      <section className="container-px mx-auto max-w-7xl pt-3 sm:pt-5">
        <HeroSlider banners={HERO_SLIDES} />
      </section>

      <section className="container-px mx-auto max-w-7xl py-6 sm:py-8">
        <SectionHeader title="Shop by Category" subtitle="Food, puja samagri, natural products and daily essentials" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={categoryHref(c.slug)}
              className="group relative aspect-[5/4] overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:aspect-[4/3]"
            >
              {c.image_url && (
                <Image
                  src={c.image_url}
                  alt={c.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="truncate text-sm font-bold text-white sm:text-lg">
                  {c.name}
                </h3>
                <p className="line-clamp-1 text-[11px] text-white/80 sm:text-xs">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <PujaSection
        title="Puja Samagri"
        subtitle="Complete puja packages & Pandit Ji booking"
        viewAllHref="/puja"
        pujas={pujas}
      />

      {SECTION_CONFIG.map((s) => (
        <CategoryProductSection
          key={s.type}
          title={s.title}
          subtitle={s.subtitle}
          viewAllHref={s.href}
          products={productsByType[s.type]}
        />
      ))}
    </StoreShell>
  );
}
