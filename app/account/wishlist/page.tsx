'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { ProductCard } from '@/components/store/product-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/lib/types';

export default function WishlistPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('wishlist')
      .select('product_id, products(*, product_images(*))')
      .eq('user_id', user.id);
    setProducts((data ?? []).map((r: any) => r.product as Product).filter(Boolean));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function remove(productId: string) {
    if (!user) return;
    await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', productId);
    load();
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold">My Wishlist</h1>
        <p className="mt-1 text-sm text-muted-foreground">Products you&apos;ve saved for later.</p>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10">
            <Heart className="h-8 w-8 text-rose-500" />
          </div>
          <p className="mt-4 font-medium">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">Save products you love to find them here.</p>
          <Link href="/shop" className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} />
              <button
                onClick={() => remove(p.id)}
                className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1.5 backdrop-blur transition hover:bg-background"
                aria-label="Remove from wishlist"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
