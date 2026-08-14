import Link from 'next/link';
import Image from 'next/image';
import { Truck, ShieldCheck, Leaf, BadgeCheck } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { HeroSlider, type Slide } from '@/components/store/hero-slider';
import { ZeroChargesBanner } from '@/components/store/zero-charges-banner';
import { CategoryProductSection } from '@/components/store/category-product-section';
import { SectionHeader } from '@/components/store/section-header';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Category, Product } from '@/lib/types';

export const revalidate = 60;

const HERO_SLIDES: Slide[] = [
  {
    id: 'hero-food',
    title: 'Fresh Food, Made With Love',
    subtitle:
      'Delicious food from our cloud kitchen, prepared fresh and delivered to your doorstep.',
    image_url:
      'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1600',
    cta_text: 'Order Food',
    cta_link: '/category/food',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'hero-puja',
    title: 'Complete Puja Packages',
    subtitle:
      'Book complete puja samagri packages and get everything you need for your puja in one place.',
    image_url:
      'https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=1600',
    cta_text: 'Explore Puja',
    cta_link: '/category/puja-samagri',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'hero-natural',
    title: 'Pure & Natural Products',
    subtitle:
      'Discover carefully selected natural products for a healthier lifestyle.',
    image_url:
      'https://images.pexels.com/photos/2255935/pexels-photo-2255935.jpeg?auto=compress&cs=tinysrgb&w=1600',
    cta_text: 'Shop Natural',
    cta_link: '/category/natural-products',
    sort_order: 3,
    is_active: true,
  },
  {
    id: 'hero-general',
    title: 'Everything You Need, In One Place',
    subtitle: 'Shop everyday essentials and useful products at Sajjan Mart.',
    image_url:
      'https://images.pexels.com/photos/4498136/pexels-photo-4498136.jpeg?auto=compress&cs=tinysrgb&w=1600',
    cta_text: 'Shop Now',
    cta_link: '/category/general',
    sort_order: 4,
    is_active: true,
  },
  {
    id: 'hero-charges',
    title: 'NO GST • NO TAX • NO PLATFORM FEES',
    subtitle: 'What you see is what you pay. Shop with complete price transparency.',
    image_url: null,
    cta_text: 'Start Shopping',
    cta_link: '/shop',
    sort_order: 5,
    is_active: true,
    variant: 'charges',
  },
];

const SERVICE_BENEFITS = [
  { icon: Truck, title: 'Fast Delivery', desc: 'Fresh products delivered quickly to your doorstep.' },
  { icon: ShieldCheck, title: 'Secure Payments', desc: 'Safe and secure online payment experience.' },
  { icon: Leaf, title: '100% Quality', desc: 'Quality products selected for our customers.' },
  { icon: BadgeCheck, title: 'Quality Assured', desc: 'Trusted products with quality assurance.' },
];

const SECTION_CONFIG = [
  { type: 'food', title: 'Food', subtitle: 'Freshly prepared food from our cloud kitchen', href: '/category/food' },
  { type: 'puja_samagri', title: 'Puja Samagri', subtitle: 'Complete puja packages and essential samagri', href: '/category/puja-samagri' },
  { type: 'natural', title: 'Natural Products', subtitle: 'Pure and carefully selected natural products', href: '/category/natural-products' },
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

  return {
    categories: (categoriesResult.data ?? []) as Category[],
    productsByType,
  };
}

export default async function HomePage() {
  const { categories, productsByType } = await getHomeData();

  const categoryHref = (slug: string) =>
    slug === 'puja-samagri' ? '/category/puja-samagri' : `/category/${slug}`;

  return (
    <StoreShell>
      {/* Hero */}
      <section className="container-px mx-auto max-w-7xl pt-6">
        <HeroSlider banners={HERO_SLIDES} />
      </section>

      {/* No GST / No Tax / No Fees highlight */}
      <section className="container-px mx-auto max-w-7xl pt-6">
        <ZeroChargesBanner />
      </section>

      {/* Service benefits */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SERVICE_BENEFITS.map((b) => (
            <div key={b.title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by category */}
      <section className="container-px mx-auto max-w-7xl py-6">
        <SectionHeader title="Shop by Category" subtitle="Everything you need, in one place" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={categoryHref(c.slug)}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-card"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <h3 className="font-display text-lg font-semibold text-white">{c.name}</h3>
                <p className="text-xs text-white/80 line-clamp-1">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Category product sections */}
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
