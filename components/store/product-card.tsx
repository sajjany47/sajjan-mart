'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { formatINR, discountedPrice } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const [wished, setWished] = useState(false);
  const image = product.product_images?.[0]?.url;
  const price = discountedPrice(product.base_price, product.discount_percent);

  async function toggleWishlist() {
    if (!user) {
      toast.error('Please sign in to save items to your wishlist.');
      return;
    }
    if (wished) {
      await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id);
      setWished(false);
      toast.success('Removed from wishlist');
    } else {
      await supabase
        .from('wishlist')
        .insert({ user_id: user.id, product_id: product.id });
      setWished(true);
      toast.success('Added to wishlist');
    }
  }

  function handleAdd() {
    addItem({
      type: 'product',
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      price,
      quantity: 1,
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10" />
          </div>
        )}
        {product.discount_percent > 0 && (
          <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
            {product.discount_percent}% OFF
          </Badge>
        )}
        {product.product_type === 'food' && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-2"
          >
            {product.metadata?.veg ? 'Veg' : 'Non-Veg'}
          </Badge>
        )}
      </Link>

      <button
        onClick={toggleWishlist}
        aria-label="Toggle wishlist"
        className="absolute right-2 top-12 rounded-full bg-background/80 p-1.5 backdrop-blur transition hover:bg-background"
      >
        <Heart className={`h-4 w-4 ${wished ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
      </button>

      <div className="flex flex-1 flex-col p-3">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {product.description}
        </p>

        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span>{Number(product.rating).toFixed(1)}</span>
          <span>·</span>
          <span>{product.review_count} reviews</span>
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold">{formatINR(price)}</span>
            {product.discount_percent > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {formatINR(product.base_price)}
              </span>
            )}
          </div>
          <Button onClick={handleAdd} size="sm" className="mt-2 w-full">
            <ShoppingBag className="mr-1 h-4 w-4" /> Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
