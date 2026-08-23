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
  CheckCircle2,
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
          <div className="relative mx-auto h-28 w-28 flex items-center justify-center rounded-3xl bg-primary/10 text-primary mb-6 shadow-xl shadow-primary/10 border border-primary/20">
            <ShoppingBag className="h-14 w-14" />
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white text-xs font-bold shadow-md">
              0
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your Cart is Empty</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed text-sm">
            Looks like you haven&apos;t added any items to your cart yet. Explore our delicious food, Puja samagri, and kitchen products!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button size="lg" className="w-full px-8 shadow-lg shadow-primary/25 font-semibold">
                Explore Shop <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/category/food" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full px-6">
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
        {/* Top Header Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-4 mb-4 border-b border-border/40">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Shopping Cart</h1>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                {items.reduce((acc, item) => acc + item.quantity, 0)} {items.reduce((acc, item) => acc + item.quantity, 0) === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Review your selected items and apply coupons before checkout
            </p>
          </div>

          <Link href="/shop" className="self-start md:self-auto">
            <Button variant="ghost" size="sm" className="text-xs font-medium hover:bg-card">
              Continue Shopping <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Free Shipping Progress Indicator */}
        {freeShippingThreshold > 0 && (
          <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
              <span className="flex items-center gap-2 text-foreground">
                <Truck className="h-4 w-4 text-primary animate-pulse" />
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Add <strong className="text-primary font-bold">{formatINR(remainingForFreeShipping)}</strong> more to get <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">FREE Delivery!</span>
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Congratulations! You unlocked FREE Delivery!
                  </span>
                )}
              </span>
              <span className="text-xs font-bold text-muted-foreground">{shippingProgress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80 p-0.5 border border-border/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-emerald-500 to-primary transition-all duration-500 shadow-sm"
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
                className={`overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-300 hover:shadow-md ${section.card}`}
              >
                {/* Section Header */}
                <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${section.header}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/90 shadow-sm border border-border/50">
                      <section.icon className={`h-4 w-4 ${section.badge.split(' ')[1]}`} />
                    </span>
                    <div>
                      <h2 className="text-sm font-bold tracking-wide">{section.label}</h2>
                      <p className="text-[11px] text-muted-foreground">{section.items.length} item(s) in this section</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-background/90 px-3 py-1.5 text-xs shadow-xs border border-border/50">
                    <Truck className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="text-[11px]">
                      <span className="font-semibold text-foreground">{getDeliveryEstimate(section.key).title}:</span>{' '}
                      <span className="font-bold text-primary">{getDeliveryEstimate(section.key).detail}</span>
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-border/50 p-3 sm:p-4">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className="group flex flex-col sm:flex-row gap-4 rounded-xl p-3 sm:p-4 transition-colors hover:bg-muted/30"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-muted border border-border/60 shadow-xs group-hover:border-primary/30 transition-all">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="112px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground bg-muted/60">
                            <ShoppingBag className="h-8 w-8 stroke-[1.5]" />
                          </div>
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${typeBadgeClass(item)}`}>
                                  {typeLabel(item)}
                                </span>
                                {item.bookingDate && (
                                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/50">
                                    📅 {item.bookingDate} {item.bookingTime ? `· ${item.bookingTime}` : ''}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={item.type === 'product' ? `/product/${item.slug}` : `/puja`}
                                  className="font-display text-base font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                                >
                                  {item.name}
                                </Link>
                                <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs font-bold border border-emerald-500/20">
                                  {formatINR(item.price)} each
                                </span>
                              </div>
                            </div>

                            {/* Remove Item Button */}
                            <button
                              onClick={() => removeItem(item.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                              title="Remove item"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Extra Metadata (Variant, Pandit, Add-ons) */}
                          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {item.variantName && (
                              <p className="flex items-center gap-1.5">
                                <span className="font-medium text-foreground">Variant:</span> {item.variantName}
                              </p>
                            )}
                            {item.panditName && (
                              <p className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                                <span>🛕 Pandit Ji:</span> {item.panditName}
                              </p>
                            )}
                            {item.addOns && item.addOns.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span className="font-medium text-foreground">Add-ons:</span>
                                {item.addOns.map((a) => (
                                  <span
                                    key={a.id}
                                    className="inline-flex items-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-medium border border-amber-500/20"
                                  >
                                    +{a.name} ({formatINR(a.price)})
                                  </span>
                                ))}
                              </div>
                            )}
                            {item.selectedItems && item.selectedItems.length > 0 && (
                              <div className="mt-1.5 rounded-lg bg-muted/60 p-2 text-[11px] border border-border/40">
                                <span className="font-semibold text-foreground block mb-0.5">Samagri Items Checklist:</span>
                                <div className="flex flex-wrap gap-1">
                                  {item.selectedItems.map((s, idx) => (
                                    <span key={`${s.name}-${idx}`} className="rounded bg-card px-1.5 py-0.5 border border-border/60">
                                      {s.name} (x{s.qty})
                                    </span>
                                  ))}
                                </div>
                              </div>
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

                        {/* Bottom Row: Quantity Controls & Subtotal */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Qty:</span>
                            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/60 p-1 shadow-2xs">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-background hover:shadow-xs"
                                onClick={() => updateQty(item.id, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-7 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg hover:bg-background hover:shadow-xs"
                                onClick={() => updateQty(item.id, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Item Subtotal:</span>
                            <div className="inline-flex items-center rounded-xl bg-primary/10 border border-primary/25 px-3 py-1.5 text-base sm:text-lg font-extrabold text-primary shadow-2xs">
                              <span className="pl-0.5 tracking-tight font-sans">{formatINR(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Quick Customer Support Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-accent/5 p-5 shadow-sm">
              <div className="flex items-center gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                  <PhoneCall className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Need help or custom bulk order?</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{QUICK_SERVICE_CONTACT}</p>
                </div>
              </div>

              <a
                href={`tel:${QUICK_SERVICE_CONTACT.replace(/\D/g, '')}`}
                className="shrink-0 w-full sm:w-auto"
              >
                <Button variant="outline" size="sm" className="w-full text-xs font-semibold hover:bg-primary hover:text-primary-foreground">
                  Call Support
                </Button>
              </a>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <Button
                variant="ghost"
                onClick={clearCart}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear Cart
              </Button>

              <Link href="/shop">
                <Button variant="outline" className="text-xs font-semibold">
                  <ShoppingBag className="mr-1.5 h-3.5 w-3.5" /> Explore More Items
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - Order Summary Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-lg shadow-black/5 backdrop-blur-md">
              <h2 className="font-display text-lg font-bold tracking-tight border-b border-border/50 pb-3 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {items.length} {items.length === 1 ? 'line item' : 'line items'}
                </span>
              </h2>

              {/* Coupon Section */}
              <div className="mt-5 space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Have a promo coupon?</span>
                  {appliedCoupon && <span className="text-[11px] text-emerald-600 font-bold">Active</span>}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ENTER COUPON CODE"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      className="pl-9 text-xs font-semibold uppercase tracking-wider uppercase"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={applyCouponCode}
                    className="shrink-0 text-xs font-bold px-4 hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    Apply
                  </Button>
                </div>

                {appliedCoupon && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                    <span className="flex items-center gap-1.5 font-bold">
                      <Sparkles className="h-3.5 w-3.5" /> Code &quot;{appliedCoupon}&quot; Applied!
                    </span>
                    <button
                      onClick={removeCoupon}
                      className="text-[11px] font-semibold text-destructive underline hover:no-underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="mt-6 space-y-3 text-sm border-t border-border/50 pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-foreground">{formatINR(subtotal)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Coupon Discount
                    </span>
                    <span className="font-bold">-{formatINR(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs">FREE</span>
                    ) : (
                      <span className="font-semibold text-foreground">{formatINR(shipping)}</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    Taxes &amp; Fees <span className="text-[10px] text-emerald-600 font-bold">(0% GST)</span>
                  </span>
                  <span>{formatINR(tax)}</span>
                </div>

                <div className="border-t border-border/80 pt-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-base font-bold text-foreground block">Grand Total</span>
                      <span className="text-[11px] text-muted-foreground">Inclusive of all taxes</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-primary font-sans tracking-tight pl-1">
                      {formatINR(total)}
                    </span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="mt-2 text-center rounded-lg bg-emerald-500/10 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🎉 You are saving {formatINR(couponDiscount)} on this order!
                    </div>
                  )}
                </div>
              </div>

              {/* Food Location Restriction Warning */}
              {isCheckoutDisabled && (
                <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-destructive text-sm">Food Delivery Restricted</p>
                      <p className="text-muted-foreground mt-0.5 leading-relaxed">
                        Your delivery address is outside our <strong className="text-foreground">6 km quick food delivery range</strong>. Food checkout is disabled for your current pin.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-700 dark:text-emerald-300 leading-relaxed">
                    <strong>✅ Good news:</strong> Natural Products, General Items &amp; Puja Samagri have <strong>NO range restriction</strong> — you can order them anytime!
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Please remove food items from your cart or select a closer delivery address in the header.
                  </p>
                </div>
              )}

              {/* Checkout CTA */}
              <div className="mt-6 space-y-3">
                {user ? (
                  isCheckoutDisabled ? (
                    <Button className="w-full text-xs font-bold py-6 cursor-not-allowed opacity-60" size="lg" disabled>
                      Checkout Restricted (Out of Food Range)
                    </Button>
                  ) : (
                    <Link href="/checkout" className="block">
                      <Button
                        className="w-full font-bold text-sm py-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                        size="lg"
                      >
                        Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/login?redirect=/cart" className="block">
                    <Button className="w-full font-bold text-sm py-6 shadow-md" size="lg">
                      Sign in to Checkout <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>

              {/* Trust badges */}
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 text-center text-[10px] text-muted-foreground">
                <div className="flex flex-col items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">100% Safe</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-medium">Fast Express</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Zero GST</span>
                </div>
              </div>
            </div>

            {/* Zero Charges Info Banner */}
            <ZeroChargesBanner variant="compact" hideButton />
          </aside>
        </div>
      </div>

      {/* Mobile Fixed Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/80 bg-card/95 p-3.5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Grand Total</span>
            <span className="font-sans text-xl font-extrabold text-primary tracking-tight pl-0.5">{formatINR(total)}</span>
          </div>

          {user ? (
            isCheckoutDisabled ? (
              <Button className="flex-1 font-bold text-xs h-11 cursor-not-allowed opacity-60" disabled>
                Out of Food Range
              </Button>
            ) : (
              <Link href="/checkout" className="flex-1">
                <Button className="w-full font-bold text-sm h-11 shadow-md shadow-primary/25">
                  Proceed to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            )
          ) : (
            <Link href="/login?redirect=/cart" className="flex-1">
              <Button className="w-full font-bold text-xs h-11 shadow-md">
                Sign In to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
