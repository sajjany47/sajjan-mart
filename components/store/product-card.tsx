'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { formatINR, discountedPrice } from '@/lib/format';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Product } from '@/lib/types';
import { AddonDialog, AddOnOption } from '@/components/store/addon-dialog';

export function ProductCard({ product }: { product: Product }) {
  const { items, addItem, updateQty, removeItem } = useCart();
  const { user } = useAuth();
  const cartItem = items.find((i) => i.type === 'product' && i.productId === product.id);
  const [wished, setWished] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);
  const image = product.product_images?.[0]?.url;
  const price = discountedPrice(product.sales_price, product.discount_percent);

  const addOnOptions: AddOnOption[] = (product.add_on_links ?? []).flatMap((link) => {
    const a = link.add_on;
    return a ? [{ id: a.id, name: a.name, price: Number(a.price) }] : [];
  });

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
    if (addOnOptions.length > 0) {
      setAddonOpen(true);
      return;
    }
    addItem({
      type: 'product',
      productType: product.product_type,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      price,
      quantity: 1,
      addOns: [],
    });
    toast.success(`${product.name} added to cart`);
  }

  function commitAddWithAddOns(addOns: AddOnOption[], unitPrice: number) {
    setAddonOpen(false);
    addItem({
      type: 'product',
      productType: product.product_type,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image,
      price: unitPrice,
      quantity: 1,
      addOns,
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
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/90 px-2 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur">
            {product.food_type === 'veg' || (product.metadata?.veg === true && !product.food_type) ? (
              <>
                <span className="flex h-3 w-3 items-center justify-center rounded-sm border border-emerald-600 p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </span>
                <span className="text-emerald-700 dark:text-emerald-400">Veg</span>
              </>
            ) : product.food_type === 'egg' ? (
              <>
                <span className="flex h-3 w-3 items-center justify-center rounded-sm border border-amber-600 p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                </span>
                <span className="text-amber-700 dark:text-amber-400">Egg</span>
              </>
            ) : (
              <>
                <span className="flex h-3 w-3 items-center justify-center rounded-sm border border-rose-600 p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                </span>
                <span className="text-rose-700 dark:text-rose-400">Non-Veg</span>
              </>
            )}
          </div>
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
                {formatINR(product.sales_price)}
              </span>
            )}
          </div>
          {cartItem ? (
            <div className="mt-2 flex h-9 items-center justify-between rounded-lg border border-primary bg-background overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-9 rounded-none hover:bg-primary/10 text-primary"
                onClick={() => {
                  if (cartItem.quantity > 1) {
                    updateQty(cartItem.id, cartItem.quantity - 1);
                  } else {
                    removeItem(cartItem.id);
                    toast.success(`${product.name} removed from cart`);
                  }
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold text-foreground select-none">
                {cartItem.quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-9 rounded-none hover:bg-primary/10 text-primary"
                onClick={() => {
                  updateQty(cartItem.id, cartItem.quantity + 1);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={handleAdd} size="sm" className="mt-2 w-full">
              <ShoppingBag className="mr-1 h-4 w-4" /> Add to Cart
            </Button>
          )}
        </div>
      </div>

      <AddonDialog
        productName={product.name}
        basePrice={price}
        quantity={1}
        addOns={addOnOptions}
        open={addonOpen}
        onOpenChange={setAddonOpen}
        onConfirm={commitAddWithAddOns}
      />
    </div>
  );
}