import Link from 'next/link';
import Image from 'next/image';
import { Star, Quote, Clock, Leaf, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { HeroSlider } from '@/components/store/hero-slider';
import { ProductCard } from '@/components/store/product-card';
import { SectionHeader } from '@/components/store/section-header';
import { Button } from '@/components/ui/button';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Banner, Category, Product, Puja } from '@/lib/types';

export const revalidate = 60;

async function getHomeData() {
  const supabase = createServerSupabase();
  const [banners, categories, todayDeals, featured, latest, bestSellers, popular, pujas] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('categories').select('*').order('sort_order'),
    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('is_active', true)
      .eq('is_today_deal', true)
      .limit(4),
    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .limit(8),
    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('is_active', true)
      .eq('is_best_seller', true)
      .limit(4),
    supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('is_active', true)
      .eq('is_popular', true)
      .limit(8),
    supabase.from('pujas').select('*').eq('is_active', true).limit(6),
  ]);

  return {
    banners: (banners.data ?? []) as Banner[],
    categories: (categories.data ?? []) as Category[],
    todayDeals: (todayDeals.data ?? []) as Product[],
    featured: (featured.data ?? []) as Product[],
    latest: (latest.data ?? []) as Product[],
    bestSellers: (bestSellers.data ?? []) as Product[],
    popular: (popular.data ?? []) as Product[],
    pujas: (pujas.data ?? []) as Puja[],
  };
}

const REVIEWS = [
  {
    name: 'Anjali Sharma',
    location: 'Mumbai',
    rating: 5,
    text: 'The Satyanarayan Puja package was perfect. Pandit ji was on time and all samagri was included. Highly recommend!',
  },
  {
    name: 'Rohit Verma',
    location: 'Pune',
    rating: 5,
    text: 'Ordered chicken biryani from their cloud kitchen. Tasted just like home. Delivery was quick and food was hot.',
  },
  {
    name: 'Priya Nair',
    location: 'Bengaluru',
    rating: 4,
    text: 'The organic turmeric and forest honey are amazing. You can really taste the difference from supermarket products.',
  },
];

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <StoreShell>
      {/* Hero */}
      <section className="container-px mx-auto max-w-7xl py-6">
        <HeroSlider banners={data.banners} />
      </section>

      {/* Trust badges */}
      <section className="container-px mx-auto max-w-7xl py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Truck, title: 'Fast Delivery', desc: 'Within 30-45 min' },
            { icon: ShieldCheck, title: 'Secure Payments', desc: 'Razorpay & Cashfree' },
            { icon: Leaf, title: '100% Organic', desc: 'Direct from farms' },
            { icon: Sparkles, title: 'Quality Assured', desc: 'Handpicked items' },
          ].map((b) => (
            <div key={b.title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
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

      {/* Categories */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <SectionHeader title="Shop by Category" subtitle="Everything you need, in one place" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              href={c.slug === 'puja-samagri' ? '/puja' : `/category/${c.slug}`}
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

      {/* Today's Deals */}
      {data.todayDeals.length > 0 && (
        <section className="container-px mx-auto max-w-7xl py-8">
          <SectionHeader
            title="Today's Deals"
            subtitle="Limited time offers - grab them fast"
            link={{ href: '/shop?deals=true', label: 'View all' }}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.todayDeals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Puja banner */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <div className="grid items-center gap-6 p-8 md:grid-cols-2 md:p-12">
            <div>
              <h2 className="font-display text-3xl font-semibold md:text-4xl">Complete Puja Packages</h2>
              <p className="mt-3 text-primary-foreground/80">
                Book a pandit and get all the samagri delivered. Choose from Satyanarayan, Durga, Lakshmi, Griha Pravesh and more.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {data.pujas.slice(0, 4).map((p) => (
                  <Link key={p.id} href={`/puja/${p.slug}`}>
                    <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm backdrop-blur hover:bg-white/25">
                      {p.name}
                    </span>
                  </Link>
                ))}
              </div>
              <Link href="/puja" className="mt-6 inline-block">
                <Button variant="secondary">Book a Puja</Button>
              </Link>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src="https://images.pexels.com/photos/8468368/pexels-photo-8468368.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Puja"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <SectionHeader title="Featured Products" subtitle="Handpicked for you" link={{ href: '/shop', label: 'View all' }} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.featured.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Latest */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <SectionHeader title="Latest Products" subtitle="New arrivals across all categories" link={{ href: '/shop', label: 'View all' }} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.latest.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Best sellers */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <SectionHeader title="Best Sellers" subtitle="What our customers love" link={{ href: '/shop', label: 'View all' }} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Popular */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <SectionHeader title="Popular Right Now" subtitle="Trending in your area" link={{ href: '/shop', label: 'View all' }} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.popular.slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Offer banner */}
      <section className="container-px mx-auto max-w-7xl py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-secondary p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Food Delivery</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Hot meals in 30 minutes</h3>
            <p className="mt-2 text-sm text-muted-foreground">Pizzas, biryani, momos and more from our cloud kitchen.</p>
            <Link href="/category/food" className="mt-4 inline-block">
              <Button>Order Food</Button>
            </Link>
          </div>
          <div className="rounded-2xl bg-accent p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Organic</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">Direct from farmers</h3>
            <p className="mt-2 text-sm text-muted-foreground">No chemicals, no adulteration - just pure goodness.</p>
            <Link href="/category/natural-products" className="mt-4 inline-block">
              <Button>Shop Natural</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="container-px mx-auto max-w-7xl py-12">
        <SectionHeader title="Customer Reviews" subtitle="What our customers say about us" />
        <div className="grid gap-4 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="rounded-2xl border border-border bg-card p-6">
              <Quote className="h-8 w-8 text-primary/40" />
              <p className="mt-3 text-sm text-muted-foreground">{r.text}</p>
              <div className="mt-4 flex items-center gap-1">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <div className="mt-2">
                <p className="text-sm font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </StoreShell>
  );
}
