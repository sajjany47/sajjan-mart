'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag, Truck, PhoneCall } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useLocation } from '@/components/providers/location-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { toast } from 'sonner';
import { computeTotals, getTaxRate, getFreeShippingThreshold } from '@/lib/store-config-utils';
import { groupItemsBySection } from '@/lib/cart-sections';
import { getDeliveryEstimate, QUICK_SERVICE_CONTACT } from '@/lib/delivery-estimate';
import type { CartItem } from '@/lib/types';

interface StoreConfigData {
  tax_rate: number;
  shipping_charge: number;
  free_shipping_threshold: number;
}

function typeLabel(item: CartItem): string {
  if (item.type === 'puja') return 'Puja Booking';
  switch (item.productType) {
    case 'food':
      return 'Food';
    case 'natural':
      return 'Natural';
    case 'puja_samagri':
      return 'Puja Samagri';
    default:
      return 'General';
  }
}

function typeBadgeClass(item: CartItem): string {
  if (item.type === 'puja') return 'bg-indigo-100 text-indigo-700 dark:text-indigo-300';
  switch (item.productType) {
    case 'food':
      return 'bg-warning/15 text-warning';
    case 'natural':
      return 'bg-primary/15 text-primary';
    case 'puja_samagri':
      return 'bg-purple-100 text-purple-700 dark:text-purple-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function dayDiffFromToday(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function PujaNote({ date }: { date?: string }) {
  const diff = dayDiffFromToday(date);
  let extra: string | null = null;
  if (diff === 0) {
    extra = 'Same-day puja — the exact time will be confirmed separately and may not match your selection.';
  } else if (diff === 1) {
    extra = 'Puja booked for tomorrow — the delivery/execution date & time may not match your selection.';
  }
  return (
    <div className="mt-2 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
      <p>Delivery date &amp; time may not match your selected booking date &amp; time.</p>
      {extra && <p className="mt-0.5 font-medium">{extra}</p>}
    </div>
  );
}

export function CartClient() {
  const { items, removeItem, updateQty, subtotal, clearCart, appliedCoupon, couponDiscount, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const { isWithinRange } = useLocation();
  const [coupon, setCoupon] = useState('');
  const [config, setConfig] = useState<StoreConfigData | null>(null);

  const hasFood = items.some((i) => i.productType === 'food');
  const isCheckoutDisabled = hasFood && !isWithinRange;

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }: any) => {
        if (data) setConfig(data as StoreConfigData);
      });
  }, []);

  const { shipping, tax, total } = computeTotals(subtotal, couponDiscount, config ?? {});
  const taxRate = getTaxRate(config ?? {});
  const freeShippingThreshold = getFreeShippingThreshold(config ?? {});

  async function applyCouponCode() {
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
    if (data.valid_until && new Date(data.valid_until).getTime() < Date.now()) {
      toast.error('This coupon has expired.');
      return;
    }
    if (data.is_one_time && !user) {
      toast.error('Please login to use this coupon.');
      return;
    }
    if (data.is_one_time && user) {
      const liveStatuses = ['pending', 'paid', 'confirmed', 'processing', 'packed', 'shipped', 'delivered'];
      const { data: pastOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);
      const alreadyUsed = (pastOrders ?? []).some(
        (o: any) => o.coupon_code === data.code && liveStatuses.includes(o.status)
      );
      if (alreadyUsed) {
        toast.error('This coupon can only be used once per customer.');
        return;
      }
    }
    if (subtotal < data.min_order) {
      toast.error(`Minimum order of ${formatINR(data.min_order)} required.`);
      return;
    }
    const d = Math.min((subtotal * data.discount_percent) / 100, data.max_discount);
    applyCoupon(data.code, Math.round(d));
    toast.success(`Coupon applied - you saved ${formatINR(d)}`);
  }

  if (items.length === 0) {
    return (
      <div className="container-px mx-auto max-w-7xl py-20 text-center">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Browse our products and add items to your cart.</p>
        <Link href="/shop" className="mt-6 inline-block">
          <Button>Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-6">
      <h1 className="font-display text-3xl font-semibold">Shopping Cart</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} item(s) in your cart</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {groupItemsBySection(items).map((section) => (
            <section key={section.key} className={`overflow-hidden rounded-2xl border border-border ${section.card}`}>
              <div className={`flex items-center justify-between border-b px-4 py-2.5 ${section.header}`}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 shadow-sm">
                    <section.icon className={`h-4 w-4 ${section.badge.split(' ')[1]}`} />
                  </span>
                  <span className="text-sm font-semibold">{section.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {section.items.length} item(s)
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-xs">
                <Truck className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">{getDeliveryEstimate(section.key).title}:</span>{' '}
                  <span className="font-semibold text-primary">{getDeliveryEstimate(section.key).detail}</span>
                </span>
              </div>
              <div className="space-y-3 p-3">
                {section.items.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-xl border border-border bg-background p-3">
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
                    {item.addOns && item.addOns.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Adds: {item.addOns.map((a) => `${a.name} (+${formatINR(a.price)})`).join(', ')}
                      </p>
                    )}
                    {item.selectedItems && item.selectedItems.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Includes: {item.selectedItems.map((s) => `${s.name} x${s.qty}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeBadgeClass(item)}`}>
                        {typeLabel(item)}
                      </span>
                      {item.bookingDate && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {item.bookingDate}
                          {item.bookingTime ? ` · ${item.bookingTime}` : ''}
                        </span>
                      )}
                    </div>
                    {item.type === 'product' && item.productType === 'food' && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        Cancellation is not applicable for food items.
                      </p>
                    )}
                    {item.type === 'puja' && <PujaNote date={item.bookingDate} />}
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
              </div>
            </section>
          ))}

          <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <PhoneCall className="h-5 w-5 text-primary" />
            </span>
            <p className="text-sm text-muted-foreground">{QUICK_SERVICE_CONTACT}</p>
          </div>

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
              <Button variant="secondary" onClick={applyCouponCode}>
                <Tag className="mr-1 h-4 w-4" /> Apply
              </Button>
            </div>
            {appliedCoupon && (
              <div className="mt-2 flex items-center justify-between text-xs text-success">
                <span>Coupon &quot;{appliedCoupon}&quot; applied</span>
                <button onClick={removeCoupon} className="text-muted-foreground underline hover:text-destructive">
                  Remove
                </button>
              </div>
            )}
            {freeShippingThreshold > 0 && shipping > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                Add {formatINR(freeShippingThreshold - subtotal)} more for free delivery
              </p>
            )}

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatINR(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatINR(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>{formatINR(tax)}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatINR(total)}</span>
                </div>
              </div>
            </div>

            {isCheckoutDisabled && (
              <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs text-destructive">
                <span className="font-semibold block">🚫 Delivery Blocked</span>
                Your cart contains food items, but your delivery location is outside our 6 km kitchen range. Please remove food items or update your location in the header.
              </div>
            )}

            {user ? (
              isCheckoutDisabled ? (
                <Button className="mt-5 w-full cursor-not-allowed text-xs font-semibold" size="lg" disabled>
                  Checkout (Out of Range)
                </Button>
              ) : (
                <Link href="/checkout" className="mt-5 block">
                  <Button className="w-full" size="lg">
                    Checkout <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )
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
  );
}
