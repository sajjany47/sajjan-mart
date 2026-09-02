'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronRight,
  XCircle,
} from 'lucide-react';
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
import { CheckoutStepper } from '@/components/store/checkout-stepper';
import { ZeroChargesBanner } from '@/components/store/zero-charges-banner';

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
  if (item.type === 'puja') return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  switch (item.productType) {
    case 'food':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'natural':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    case 'puja_samagri':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
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
    <div className="mt-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 shrink-0 text-indigo-500 mt-0.5" />
        <div>
          <p className="font-medium">Delivery date &amp; time may not match your selected booking date &amp; time.</p>
          {extra && <p className="mt-1 font-semibold text-indigo-600 dark:text-indigo-400">{extra}</p>}
        </div>
      </div>
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

  const shippingProgress = freeShippingThreshold > 0 
    ? Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100))
    : 100;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

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
      <div className="min-h-[70vh] flex flex-col justify-center items-center">
        <CheckoutStepper currentStep={1} />
        <div className="container-px mx-auto max-w-lg py-12 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <ShoppingBag className="h-10 w-10 text-primary/50" />
          </div>
          <h1 className="font-display text-2xl font-bold">Your Cart is Empty</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            Add food, puja samagri, natural products or general items to get started.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop">
              <Button className="px-6 font-semibold">
                Explore Shop <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/category/food">
              <Button variant="outline" className="px-6">
                Order Food 🍲
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-muted/20">
      <CheckoutStepper currentStep={1} />

      <div className="container-px mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between py-4 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold sm:text-2xl">Shopping Cart</h1>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {items.reduce((acc, item) => acc + item.quantity, 0)} items
            </span>
          </div>
          <Link href="/shop">
            <Button variant="ghost" size="sm" className="text-xs font-medium">
              Continue Shopping <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Free Shipping Progress */}
        {freeShippingThreshold > 0 && (
          <div className="mb-5 overflow-hidden rounded-xl border border-border/60 bg-card p-3.5">
            <div className="flex items-center justify-between text-xs font-medium mb-2">
              <span className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {remainingForFreeShipping > 0 ? (
                  <span className="text-muted-foreground">
                    Add <strong className="text-foreground">{formatINR(remainingForFreeShipping)}</strong> more for <strong className="text-emerald-600 dark:text-emerald-400">FREE delivery</strong>
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✅ Free delivery unlocked!
                  </span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">{shippingProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Main Cart Items Column */}
          <div className="space-y-6">
            {groupItemsBySection(items).map((section) => (
              <section
                key={section.key}
                className="overflow-hidden rounded-xl border border-border/60 bg-card"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <section.icon className={`h-4 w-4 ${section.badge.split(' ')[1]}`} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold">{section.label}</h2>
                      <p className="text-[11px] text-muted-foreground">{section.items.length} item(s)</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Truck className="h-3 w-3" />
                    <span className="font-medium text-foreground">{getDeliveryEstimate(section.key).title}</span>
                    {getDeliveryEstimate(section.key).detail}
                  </span>
                </div>

                {/* Items List */}
                <div className="divide-y divide-border/40 p-3 sm:p-4">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground/40">
                            <ShoppingBag className="h-7 w-7 stroke-[1.5]" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${typeBadgeClass(item)}`}>
                                  {typeLabel(item)}
                                </span>
                                {item.bookingDate && (
                                  <span className="text-[10px] text-muted-foreground">
                                    📅 {item.bookingDate}{item.bookingTime ? ` · ${item.bookingTime}` : ''}
                                  </span>
                                )}
                              </div>
                              <Link
                                href={item.type === 'product' ? `/product/${item.slug}` : `/puja`}
                                className="mt-1 block text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                              >
                                {item.name}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                {formatINR(item.price)} each
                              </p>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Extra Metadata */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            {item.variantName && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5">Variant: {item.variantName}</span>
                            )}
                            {item.panditName && (
                              <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-indigo-600 dark:text-indigo-400 font-medium">🛕 {item.panditName}</span>
                            )}
                            {item.addOns && item.addOns.length > 0 && (
                              item.addOns.map((a) => (
                                <span key={a.id} className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                                  +{a.name}
                                </span>
                              ))
                            )}
                            {item.selectedItems && item.selectedItems.length > 0 && (
                              <span className="rounded-md bg-muted px-1.5 py-0.5">
                                {item.selectedItems.length} samagri items
                              </span>
                            )}
                          </div>

                          {/* Specific Notices */}
                          {item.type === 'product' && item.productType === 'food' && (
                            <div className="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                              <div className="flex items-center gap-1.5 font-medium">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                <span>Cancellation is not applicable for food items once confirmed.</span>
                              </div>
                            </div>
                          )}

                          {item.type === 'puja' && <PujaNote date={item.bookingDate} />}
                        </div>

                        {/* Bottom Row: Quantity + Subtotal */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-border bg-card">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-l-lg"
                              onClick={() => updateQty(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-r-lg"
                              onClick={() => updateQty(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-extrabold text-foreground">{formatINR(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Support Banner */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <PhoneCall className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold">Need help?</p>
                  <p className="text-[11px] text-muted-foreground">Call or WhatsApp us</p>
                </div>
              </div>
              <a href={`tel:${QUICK_SERVICE_CONTACT.replace(/\D/g, '')}`}>
                <Button variant="outline" size="sm" className="text-xs font-semibold">
                  Call Support
                </Button>
              </a>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 h-3 w-3" /> Clear Cart
              </Button>
              <Link href="/shop">
                <Button variant="ghost" size="sm" className="text-xs font-medium">
                  Browse More <ChevronRight className="ml-0.5 h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - Order Summary Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
              <h2 className="text-sm font-bold border-b border-border/40 pb-3">
                Order Summary
              </h2>

              {/* Coupon */}
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Coupon code"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      className="h-9 pl-8 text-xs font-medium uppercase"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={applyCouponCode}
                    className="shrink-0 px-3 text-xs font-semibold"
                  >
                    Apply
                  </Button>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                    <span className="font-bold">✅ "{appliedCoupon}" applied</span>
                    <button onClick={removeCoupon} className="font-semibold text-destructive underline">
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="mt-4 space-y-2.5 text-sm border-t border-border/40 pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">{formatINR(subtotal)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Coupon Discount</span>
                    <span className="font-bold">-{formatINR(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  {shipping === 0 ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">FREE</span>
                  ) : (
                    <span className="font-semibold text-foreground">{formatINR(shipping)}</span>
                  )}
                </div>
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>Tax (0% GST)</span>
                  <span>{formatINR(tax)}</span>
                </div>
                <div className="border-t border-border/60 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold">Total</span>
                    <span className="text-xl font-extrabold text-primary">{formatINR(total)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <p className="mt-1.5 text-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      🎉 You save {formatINR(couponDiscount)}!
                    </p>
                  )}
                </div>
              </div>

              {/* Food Restriction Warning */}
              {isCheckoutDisabled && (
                <div className="mt-4 rounded-xl border border-rose-200/60 bg-rose-50/80 p-3.5 dark:border-rose-900/30 dark:bg-rose-950/20">
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-300">🚫 Food Delivery Restricted</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    Your area is outside our 6 km food delivery range. Remove food items or change address.
                  </p>
                  <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✅ Natural, General & Puja — no range restriction.
                  </p>
                </div>
              )}

              {/* Checkout CTA */}
              <div className="mt-4">
                {user ? (
                  isCheckoutDisabled ? (
                    <Button className="w-full h-11 text-xs font-bold" disabled>
                      Checkout Restricted
                    </Button>
                  ) : (
                    <Link href="/checkout">
                      <Button className="w-full h-11 font-bold text-sm">
                        Proceed to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/login?redirect=/cart">
                    <Button className="w-full h-11 font-bold text-sm">
                      Sign in to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Trust */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center text-[10px] text-muted-foreground">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Secure</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-primary" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>0% GST</span>
                </div>
              </div>
            </div>

            {/* Zero Charges Info Banner */}
            <ZeroChargesBanner variant="compact" hideButton />
          </aside>
        </div>
      </div>

      {/* Mobile Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/60 bg-card/95 p-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground block">Total</span>
            <span className="text-lg font-extrabold text-primary">{formatINR(total)}</span>
          </div>
          {user ? (
            isCheckoutDisabled ? (
              <Button className="flex-1 h-11 text-xs font-bold" disabled>Out of Range</Button>
            ) : (
              <Link href="/checkout" className="flex-1">
                <Button className="w-full h-11 font-bold text-sm">Checkout <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </Link>
            )
          ) : (
            <Link href="/login?redirect=/cart" className="flex-1">
              <Button className="w-full h-11 font-bold text-sm">Sign In to Checkout</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
