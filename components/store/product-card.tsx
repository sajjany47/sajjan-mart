'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, ShoppingBag, Minus, Plus, ShieldCheck, Sparkles } from 'lucide-react';
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
  const [imgError, setImgError] = useState(false);
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1">
      {/* Product Image Box */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-muted/60">
        {image && !imgError ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/60 bg-secondary/20">
            <ShoppingBag className="h-10 w-10 stroke-1" />
          </div>
        )}

        {/* Discount Badge */}
        {product.discount_percent > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold text-white shadow-sm">
            {product.discount_percent}% OFF
          </span>
        )}

        {/* Zero Extra Charges Badge Pill */}
        <span className="absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-400 backdrop-blur-md border border-emerald-500/30">
          <ShieldCheck className="h-2.5 w-2.5" /> ₹0 Fees
        </span>

        {/* Food Tag */}
        {product.product_type === 'food' && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold shadow-md backdrop-blur border border-border">
            {product.food_type === 'veg' || (product.metadata?.veg === true && !product.food_type) ? (
              <>
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-sm border border-emerald-600 p-0.5">
                  <span className="h-1 w-1 rounded-full bg-emerald-600" />
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">Veg</span>
              </>
            ) : product.food_type === 'egg' ? (
              <>
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-sm border border-amber-600 p-0.5">
                  <span className="h-1 w-1 rounded-full bg-amber-600" />
                </span>
                <span className="text-amber-600 dark:text-amber-400">Egg</span>
              </>
            ) : (
              <>
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-sm border border-rose-600 p-0.5">
                  <span className="h-1 w-1 rounded-full bg-rose-600" />
                </span>
                <span className="text-rose-600 dark:text-rose-400">Non-Veg</span>
              </>
            )}
          </div>
        )}
      </Link>

      {/* Wishlist Button */}
      <button
        onClick={toggleWishlist}
        aria-label="Toggle wishlist"
        className="absolute right-2.5 top-11 rounded-full bg-background/80 p-1.5 backdrop-blur shadow-sm transition hover:bg-background hover:scale-110"
      >
        <Heart className={`h-4 w-4 ${wished ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'}`} />
      </button>

      {/* Product Content Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors leading-snug">
          {product.name}
        </Link>

        {/* Rating & Reviews */}
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.2 text-amber-600 dark:text-amber-400 font-bold">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{Number(product.rating).toFixed(1)}</span>
          </div>
          <span>({product.review_count})</span>
        </div>

        {/* Price & Add to Cart Controls */}
        <div className="mt-auto pt-3">
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-sm sm:text-base font-extrabold text-foreground">{formatINR(price)}</span>
            {product.discount_percent > 0 && (
              <span className="text-xs text-muted-foreground line-through">
                {formatINR(product.sales_price)}
              </span>
            )}
          </div>

          {cartItem ? (
            <div className="flex h-9 items-center justify-between rounded-xl border border-primary bg-primary/5 overflow-hidden shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-9 rounded-none hover:bg-primary/20 text-primary font-bold"
                onClick={() => {
                  if (cartItem.quantity > 1) {
                    updateQty(cartItem.id, cartItem.quantity - 1);
                  } else {
                    removeItem(cartItem.id);
                    toast.success(`${product.name} removed from cart`);
                  }
                }}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-extrabold text-primary select-none">
                {cartItem.quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-full w-9 rounded-none hover:bg-primary/20 text-primary font-bold"
                onClick={() => {
                  updateQty(cartItem.id, cartItem.quantity + 1);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAdd}
              size="sm"
              className="w-full h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm transition-all duration-200 active:scale-[0.98]"
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> ADD
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