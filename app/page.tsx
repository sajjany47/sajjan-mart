import Link from 'next/link';
import Image from 'next/image';
import { Truck, ShieldCheck, UserCheck, BadgeCheck, Sparkles, Receipt, ArrowRight } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { HeroSlider, type Slide } from '@/components/store/hero-slider';
import { CategoryQuickNav } from '@/components/store/category-quick-nav';
import { CategoryProductSection } from '@/components/store/category-product-section';
import { SectionHeader } from '@/components/store/section-header';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Category, Product } from '@/lib/types';

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
    badges: ['🍕 Hot & Fresh', '⚡ 6km Fast Delivery', '😋 Authentic Taste'],
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
    badges: ['🛕 PANDIT JI INCLUDED', '📦 COMPLETE PUJA SAMAGRI', '✨ 1-CLICK BOOKING'],
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
    badges: ['🌿 100% Pure & Organic', '🌶️ Farm Fresh Spices', '🟡 Pure Kacchi Ghani Oil'],
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
    badges: ['🚫 ZERO GST', '🚫 ZERO PLATFORM FEE', '🚫 ZERO TAX', '💰 100% PRICE TRANSPARENCY'],
  },
];

const SERVICE_BENEFITS = [
  { icon: ShieldCheck, title: 'Zero Extra Fees', desc: 'No GST, No Tax, No Platform Fees at Checkout.' },
  { icon: UserCheck, title: 'Pandit Ji Included', desc: 'Verified Vedic Pandit Ji paired with Puja Samagri.' },
  { icon: Truck, title: 'Fast Doorstep Delivery', desc: 'Fresh food & products delivered to your location.' },
  { icon: BadgeCheck, title: '100% Quality Assured', desc: 'Curated products with 100% quality guarantee.' },
];

const SECTION_CONFIG = [
  { type: 'food', title: 'Food', subtitle: 'Freshly prepared food from our cloud kitchen', href: '/category/food' },
  { type: 'puja_samagri', title: 'Puja Samagri', subtitle: 'Complete puja packages & Pandit Ji booking', href: '/puja' },
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

  return {
    categories: (categoriesResult.data ?? []) as Category[],
    productsByType,
  };
}

export default async function HomePage() {
  const { categories, productsByType } = await getHomeData();

  const categoryHref = (slug: string) =>
    slug === 'puja-samagri' ? '/puja' : `/category/${slug}`;

  return (
    <StoreShell>
      {/* Hero Slider */}
      <section className="container-px mx-auto max-w-7xl pt-3 sm:pt-6">
        <HeroSlider banners={HERO_SLIDES} />
      </section>

      {/* Mobile-First Category Quick Nav Bar */}
      <section className="container-px mx-auto max-w-7xl pt-4">
        <CategoryQuickNav />
      </section>

      {/* Service Benefits Grid */}
      <section className="container-px mx-auto max-w-7xl py-5 sm:py-6">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {SERVICE_BENEFITS.map((b) => (
            <div key={b.title} className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-card p-3 sm:gap-3 sm:p-3.5 shadow-sm transition-all hover:shadow-md hover:border-primary/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10 font-bold">
                <b.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm font-bold text-foreground">{b.title}</p>
                <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs line-clamp-1">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop by Category Grid */}
      <section className="container-px mx-auto max-w-7xl py-4 sm:py-6">
        <SectionHeader title="Shop by Category" subtitle="Everything you need with Zero Hidden Charges" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={categoryHref(c.slug)}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 sm:bottom-3">
                <div className="flex items-center gap-1 mb-1">
                  {c.slug === 'puja-samagri' ? (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold uppercase text-slate-950 shadow-sm">
                      🛕 +Pandit Ji Included
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-extrabold uppercase text-slate-950 shadow-sm">
                      ₹0 Hidden Fees
                    </span>
                  )}
                </div>
                <h3 className="truncate font-display text-base font-bold text-white sm:text-lg">
                  {c.name}
                </h3>
                <p className="truncate text-[11px] text-white/80 line-clamp-1 sm:text-xs">{c.description}</p>
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
