import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingBag, Heart, Truck, ShieldCheck, Clock, Leaf, ChevronRight, RotateCcw, Zap, Package } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { ProductDetailClient } from '@/components/store/product-detail-client';
import { ProductCard } from '@/components/store/product-card';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatINR, discountedPrice } from '@/lib/format';

export const revalidate = 60;

async function getProduct(slug: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('products')
    .select('*, category(*), sub_category(*), brand(*), product_images(*), product_variants(*), product_add_ons(*)')
    .eq('slug', slug)
    .maybeSingle();
  return data;
}

async function getRelated(categoryId: string, excludeId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('is_active', true)
    .eq('category_id', categoryId)
    .neq('id', excludeId)
    .limit(4);
  return data ?? [];
}

async function getReviews(productId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from('reviews')
    .select('*, profiles(full_name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(10);
  return data ?? [];
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    getRelated(product.category_id, product.id),
    getReviews(product.id),
  ]);

  const price = discountedPrice(product.sales_price, product.discount_percent);
  const meta = product.metadata ?? {};

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-5">
        {/* Breadcrumb */}
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="rounded-md px-1.5 py-0.5 transition hover:bg-accent hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <Link href={`/category/${product.category?.slug}`} className="rounded-md px-1.5 py-0.5 transition hover:bg-accent hover:text-foreground">
            {product.category?.name}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="max-w-[200px] truncate font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-10">
          {/* Images */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted/60">
              {product.product_images?.[0] && (
                <Image
                  src={product.product_images[0].url}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                />
              )}
              {product.discount_percent > 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-md">
                  {product.discount_percent}% OFF
                </span>
              )}
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                <ShieldCheck className="h-3 w-3" /> Verified
              </span>
            </div>
            {product.product_images && product.product_images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {product.product_images.map((img: any) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border-2 border-border bg-muted transition-all hover:border-primary/50">
                    <Image src={img.url} alt={img.alt ?? product.name} fill sizes="80px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            {/* Brand + Category badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {product.brand && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {product.brand.name}
                </span>
              )}
              {product.sub_category && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {product.sub_category.name}
                </span>
              )}
              {product.product_type === 'food' && (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${meta.veg ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                  {meta.veg ? '🟢 Veg' : '🔴 Non-Veg'}
                </span>
              )}
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{Number(product.rating).toFixed(1)}</span>
              </div>
              <span className="text-xs text-muted-foreground">({product.review_count} reviews)</span>
            </div>

            {/* Description */}
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            {/* Price */}
            <div className="mt-5 flex items-baseline gap-3 rounded-xl border border-border/60 bg-card p-4">
              <span className="text-3xl font-extrabold text-foreground">{formatINR(price)}</span>
              {product.discount_percent > 0 && (
                <>
                  <span className="text-base text-muted-foreground line-through">{formatINR(product.sales_price)}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Save {formatINR(product.sales_price - price)}
                  </span>
                </>
              )}
            </div>

            {/* Client interactive section */}
            <ProductDetailClient
              product={product}
              reviews={reviews as any[]}
            />

            {/* Type-specific info */}
            {product.product_type === 'food' && (meta.prep_time || meta.spice || meta.ingredients) && (
              <div className="mt-5 overflow-hidden rounded-xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-rose-50/50 p-4 dark:border-orange-900/30 dark:from-orange-950/20 dark:to-rose-950/10">
                <h3 className="text-sm font-bold text-foreground">Food Details</h3>
                <div className="mt-3 space-y-2.5 text-sm">
                  {meta.prep_time && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <Clock className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-muted-foreground">Prep time: <strong className="text-foreground">{meta.prep_time}</strong></span>
                    </div>
                  )}
                  {meta.spice && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                        <span className="text-xs">🌶️</span>
                      </div>
                      <span className="text-muted-foreground">Spice level: <strong className="text-foreground capitalize">{meta.spice}</strong></span>
                    </div>
                  )}
                  {meta.ingredients && (
                    <div>
                      <p className="mb-1.5 text-muted-foreground">Ingredients:</p>
                      <div className="flex flex-wrap gap-1">
                        {meta.ingredients.map((ing: string) => (
                          <span key={ing} className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-foreground border border-orange-100 dark:bg-white/5 dark:border-orange-900/20">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.product_type === 'natural' && (meta.organic_cert || meta.farmer || meta.farm_location || meta.harvest_date) && (
              <div className="mt-5 overflow-hidden rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-green-50/50 p-4 dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-green-950/10">
                <h3 className="text-sm font-bold text-foreground">Natural Product Details</h3>
                <div className="mt-3 space-y-2.5 text-sm">
                  {meta.organic_cert && (
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                        <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">Certified Organic</span>
                    </div>
                  )}
                  {meta.farmer && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground">Farmer: <strong className="text-foreground">{meta.farmer}</strong></span>
                    </div>
                  )}
                  {meta.farm_location && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground">Location: <strong className="text-foreground">{meta.farm_location}</strong></span>
                    </div>
                  )}
                  {meta.harvest_date && (
                    <div className="flex items-center gap-2.5">
                      <span className="text-muted-foreground">Harvested: <strong className="text-foreground">{meta.harvest_date}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card p-3 text-center transition hover:border-primary/30 hover:bg-primary/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-[11px] font-semibold">Fast Delivery</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card p-3 text-center transition hover:border-primary/30 hover:bg-primary/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-[11px] font-semibold">Secure Payment</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-card p-3 text-center transition hover:border-primary/30 hover:bg-primary/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-[11px] font-semibold">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-12">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-primary" />
              <h2 className="font-display text-lg font-bold sm:text-xl">You May Also Like</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {related.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </StoreShell>
  );
}
