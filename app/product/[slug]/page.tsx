import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingBag, Heart, Truck, ShieldCheck, Clock, Leaf, ChevronRight } from 'lucide-react';
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
      <div className="container-px mx-auto max-w-7xl py-6">
        <nav className="mb-4 flex items-center gap-1 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/category/${product.category?.slug}`} className="hover:text-primary">
            {product.category?.name}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Images */}
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {product.product_images?.[0] && (
                <Image
                  src={product.product_images[0].url}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              )}
              {product.discount_percent > 0 && (
                <div className="absolute left-4 top-4 rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground">
                  {product.discount_percent}% OFF
                </div>
              )}
            </div>
            {product.product_images && product.product_images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {product.product_images.map((img: any) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                    <Image src={img.url} alt={img.alt ?? product.name} fill sizes="80px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              {product.brand && (
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {product.brand.name}
                </span>
              )}
              {product.product_type === 'food' && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${meta.veg ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                  {meta.veg ? 'Veg' : 'Non-Veg'}
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold">{product.name}</h1>

            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(product.rating)
                        ? 'fill-warning text-warning'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
                <span className="ml-1 text-sm text-muted-foreground">
                  {Number(product.rating).toFixed(1)} ({product.review_count})
                </span>
              </div>
            </div>

            <p className="mt-4 text-muted-foreground">{product.description}</p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-semibold">{formatINR(price)}</span>
              {product.discount_percent > 0 && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatINR(product.sales_price)}
                </span>
              )}
              {product.discount_percent > 0 && (
                <span className="text-sm font-medium text-success">
                  Save {formatINR(product.sales_price - price)}
                </span>
              )}
            </div>

            <ProductDetailClient
              product={product}
              reviews={reviews as any[]}
            />

            {/* Type-specific info */}
            {product.product_type === 'food' && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Food Details</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  {meta.prep_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Preparation time: {meta.prep_time}</span>
                    </div>
                  )}
                  {meta.spice && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Spice level:</span>
                      <span className="capitalize">{meta.spice}</span>
                    </div>
                  )}
                  {meta.ingredients && (
                    <div>
                      <p className="text-muted-foreground">Ingredients:</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {meta.ingredients.map((ing: string) => (
                          <span key={ing} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.product_type === 'natural' && (
              <div className="mt-6 rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold">Natural Product Details</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  {meta.organic_cert && (
                    <div className="flex items-center gap-2 text-success">
                      <Leaf className="h-4 w-4" />
                      <span>Certified Organic</span>
                    </div>
                  )}
                  {meta.farmer && (
                    <div><span className="text-muted-foreground">Farmer:</span> {meta.farmer}</div>
                  )}
                  {meta.farm_location && (
                    <div><span className="text-muted-foreground">Farm location:</span> {meta.farm_location}</div>
                  )}
                  {meta.harvest_date && (
                    <div><span className="text-muted-foreground">Harvest date:</span> {meta.harvest_date}</div>
                  )}
                </div>
              </div>
            )}

            {/* Trust */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border p-3">
                <Truck className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xs">Fast Delivery</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <ShieldCheck className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xs">Secure Payment</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <Heart className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xs">Quality Assured</p>
              </div>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 font-display text-2xl font-semibold">Related Products</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
