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
    setProducts((data ?? []).map((r: any) => r.products as Product));
    setLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function remove(productId: string) {
    if (!user) return;
    await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', productId);
    load();
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold">My Wishlist</h1>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Heart className="h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Your wishlist is empty.</p>
          <Link href="/shop" className="mt-4"><button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Browse Products</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">My Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">{products.length} item(s)</p>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="relative">
            <ProductCard product={p} />
            <button
              onClick={() => remove(p.id)}
              className="absolute right-2 top-2 z-10 rounded-full bg-background/80 p-1.5 backdrop-blur hover:bg-background"
              aria-label="Remove from wishlist"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
