'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useState } from 'react';
import { StoreShell } from '@/components/store/store-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { toast } from 'sonner';

export default function CartPage() {
  const { items, removeItem, updateQty, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [coupon, setCoupon] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const shipping = subtotal > 499 ? 0 : 49;
  const tax = Math.round(subtotal * 0.05);
  const total = Math.max(0, subtotal - discount + shipping + tax);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', coupon.trim().toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) {
      toast.error('Invalid or expired coupon code.');
      return;
    }
    if (subtotal < data.min_order) {
      toast.error(`Minimum order of ${formatINR(data.min_order)} required.`);
      return;
    }
    const d = Math.min((subtotal * data.discount_percent) / 100, data.max_discount);
    setDiscount(Math.round(d));
    setAppliedCoupon(data.code);
    toast.success(`Coupon applied - you saved ${formatINR(d)}`);
  }

  if (items.length === 0) {
    return (
      <StoreShell>
        <div className="container-px mx-auto max-w-7xl py-20 text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Browse our products and add items to your cart.</p>
          <Link href="/shop" className="mt-6 inline-block">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <h1 className="font-display text-3xl font-semibold">Shopping Cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} item(s) in your cart</p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 rounded-xl border border-border bg-card p-3">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between gap-2">
                    <div>
                      <Link
                        href={item.type === 'product' ? `/product/${item.slug}` : `/puja`}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      {item.variantName && (
                        <p className="text-xs text-muted-foreground">Variant: {item.variantName}</p>
                      )}
                      {item.panditName && (
                        <p className="text-xs text-muted-foreground">Pandit: {item.panditName}</p>
                      )}
                      {item.selectedItems && item.selectedItems.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Includes: {item.selectedItems.map((s) => `${s.name} x${s.qty}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-border">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(item.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQty(item.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold">{formatINR(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={clearCart}>Clear cart</Button>
              <Link href="/shop"><Button variant="outline">Continue shopping</Button></Link>
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Order Summary</h2>

              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Coupon code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <Button variant="secondary" onClick={applyCoupon}>
                  <Tag className="mr-1 h-4 w-4" /> Apply
                </Button>
              </div>
              {appliedCoupon && (
                <p className="mt-2 text-xs text-success">Coupon &quot;{appliedCoupon}&quot; applied</p>
              )}

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-{formatINR(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatINR(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (5%)</span>
                  <span>{formatINR(tax)}</span>
                </div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatINR(total)}</span>
                  </div>
                </div>
              </div>

              {user ? (
                <Link href="/checkout" className="mt-5 block">
                  <Button className="w-full" size="lg">
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <div className="mt-5 space-y-2">
                  <Link href="/login" className="block">
                    <Button className="w-full">Sign in to checkout</Button>
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </StoreShell>
  );
}
