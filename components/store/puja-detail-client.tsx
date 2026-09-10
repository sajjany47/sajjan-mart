'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Minus, Plus, ShoppingBag, Star, Check, Clock, Calendar, Languages, Package, Sparkles, HandHeart, CheckSquare, X } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import type { Puja, PujaItem, Pandit } from '@/lib/types';

type PujaItemWithImage = PujaItem & { image?: string | null };

interface Props {
  puja: Puja;
  items: PujaItemWithImage[];
  pandits: Pandit[];
}

const CATEGORY_ORDER = ['basic', 'special', 'recommended'];

const CATEGORY_META: Record<
  string,
  {
    label: string;
    description: string;
    icon: typeof Sparkles;
    badgeChip: string;
    accent: string;
    checkedBg: string;
    checkedBorder: string;
    dot: string;
    fallbackTile: string;
  }
> = {
  basic: {
    label: 'Basic Items',
    description: 'Essential items needed to perform this puja. Pre-selected — uncheck anything you already have.',
    icon: Sparkles,
    badgeChip: 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    accent: 'text-emerald-700 dark:text-emerald-400',
    checkedBg: 'bg-emerald-50/70 dark:bg-emerald-500/5',
    checkedBorder: 'border-emerald-400 dark:border-emerald-500/60',
    dot: 'bg-emerald-500',
    fallbackTile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  special: {
    label: 'Special Items',
    description: 'Additional items to enhance the puja. Unselected by default — check the ones you need.',
    icon: Package,
    badgeChip: 'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    accent: 'text-amber-700 dark:text-amber-400',
    checkedBg: 'bg-amber-50/70 dark:bg-amber-500/5',
    checkedBorder: 'border-amber-400 dark:border-amber-500/60',
    dot: 'bg-amber-500',
    fallbackTile: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  recommended: {
    label: 'Recommended Items',
    description: 'Optional items for a more complete experience. Unselected by default — add as you wish.',
    icon: HandHeart,
    badgeChip: 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
    accent: 'text-violet-700 dark:text-violet-400',
    checkedBg: 'bg-violet-50/70 dark:bg-violet-500/5',
    checkedBorder: 'border-violet-400 dark:border-violet-500/60',
    dot: 'bg-violet-500',
    fallbackTile: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
};

function categoryOf(item: PujaItem): string {
  return CATEGORY_ORDER.includes(item.category) ? item.category : 'basic';
}

/** Item thumbnail with graceful fallback to the category icon when the image is missing or fails to load. */
function ItemThumb({ src, alt, tileClass, Icon }: { src?: string | null; alt: string; tileClass: string; Icon: typeof Sparkles }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="56px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className={`flex h-full w-full items-center justify-center ${tileClass}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function PujaDetailClient({ puja, items, pandits }: Props) {
  const { items: cartItems, addItem, updateQty, removeItem } = useCart();
  const [selected, setSelected] = useState<Record<string, { checked: boolean; qty: number }>>(
    () =>
      Object.fromEntries(
        items.map((i) => [
          i.id,
          { checked: categoryOf(i) === 'basic', qty: i.default_qty },
        ])
      )
  );
  const [panditId, setPanditId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  const pandit = pandits.find((p) => p.id === panditId);
  const cartItem = cartItems.find(
    (i) => i.type === 'puja' && i.pujaId === puja.id && (i.panditId ?? '') === (pandit?.id ?? '')
  );

  const itemsTotal = useMemo(() => {
    return items.reduce((sum, i) => {
      const s = selected[i.id];
      if (!s?.checked) return sum;
      return sum + i.price * s.qty;
    }, 0);
  }, [items, selected]);

  const selectedCount = useMemo(
    () => Object.values(selected).filter((s) => s.checked).length,
    [selected]
  );

  const grandTotal = itemsTotal + (pandit?.price ?? 0);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  }

  function setQty(id: string, qty: number) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], qty: Math.max(1, qty) } }));
  }

  function toggleGroup(cat: string) {
    const groupItems = items.filter((i) => categoryOf(i) === cat);
    const allChecked = groupItems.every((i) => selected[i.id]?.checked);
    setSelected((prev) => {
      const next = { ...prev };
      for (const i of groupItems) {
        next[i.id] = { ...next[i.id], checked: !allChecked };
      }
      return next;
    });
  }

  function handleAddToCart() {
    if (!bookingDate || !bookingTime) {
      toast.error('Please select a booking date and time.');
      return;
    }
    const selectedItems = items
      .filter((i) => selected[i.id]?.checked)
      .map((i) => ({ name: i.name, qty: selected[i.id].qty, price: i.price }));

    addItem({
      type: 'puja',
      pujaId: puja.id,
      name: `${puja.name} Package`,
      image: puja.image_url ?? undefined,
      price: grandTotal,
      quantity: 1,
      panditId: pandit?.id,
      panditName: pandit?.name,
      selectedItems,
      bookingDate: bookingDate || undefined,
      bookingTime: bookingTime || undefined,
    });
    toast.success(`${puja.name} package added to cart`);
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          {/* Hero: banner image + overlay title (falls back to a gradient tile when no image) */}
          <div className="relative aspect-[16/8] overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100 dark:from-orange-500/10 dark:via-amber-500/5 dark:to-rose-500/10">
            {puja.image_url ? (
              <>
                <Image src={puja.image_url} alt={puja.name} fill priority sizes="(min-width: 1024px) 860px, 100vw" className="object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12 sm:p-6">
                  <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{puja.name}</h1>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <h1 className="font-display text-3xl font-semibold text-foreground">{puja.name}</h1>
              </div>
            )}
          </div>
          <p className="mt-4 max-w-3xl text-muted-foreground">{puja.description}</p>

          {/* Puja items */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">Required Puja Items</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Items are grouped by category. Basic items are pre-selected; add
              Special or Recommended items as needed.
            </p>
            <div className="mt-4 space-y-6">
              {CATEGORY_ORDER.map((cat) => {
                const meta = CATEGORY_META[cat];
                const groupItems = items.filter((i) => categoryOf(i) === cat);
                if (groupItems.length === 0) return null;
                const groupSelected = groupItems.filter(
                  (i) => selected[i.id]?.checked
                ).length;
                const groupAllChecked =
                  groupItems.length > 0 &&
                  groupItems.every((i) => selected[i.id]?.checked);
                const groupTotal = groupItems.reduce((sum, i) => {
                  const s = selected[i.id];
                  if (!s?.checked) return sum;
                  return sum + i.price * s.qty;
                }, 0);
                return (
                  <section key={cat}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.badgeChip}`}>
                          <meta.icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {groupSelected} of {groupItems.length} selected
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {cat !== 'basic' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px]"
                            onClick={() => toggleGroup(cat)}
                          >
                            {groupAllChecked ? (
                              <>
                                <X className="mr-1 h-3 w-3" /> Clear All
                              </>
                            ) : (
                              <>
                                <CheckSquare className="mr-1 h-3 w-3" /> Select All
                              </>
                            )}
                          </Button>
                        )}
                        <span className={`text-xs font-semibold ${meta.accent}`}>
                          {formatINR(groupTotal)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                    <div className="mt-2.5 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card">
                      {groupItems.map((item) => {
                        const s = selected[item.id];
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-2.5 pl-3 transition sm:p-3 sm:pl-4 ${
                              s?.checked
                                ? `${meta.checkedBorder} ${meta.checkedBg}`
                                : ''
                            }`}
                          >
                            {/* Item image */}
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:h-14 sm:w-14">
                              <ItemThumb src={item.image} alt={item.name} tileClass={meta.fallbackTile} Icon={meta.icon} />
                            </div>

                            {/* Name + unit price */}
                            <label
                              htmlFor={`item-${item.id}`}
                              className="min-w-0 flex-1 cursor-pointer"
                            >
                              <span className="block text-sm font-medium leading-snug">
                                {item.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatINR(item.price)} / {item.unit}
                              </span>
                            </label>

                            {/* Hidden checkbox drives the row state (row is clickable) */}
                            <input
                              type="checkbox"
                              checked={s?.checked ?? false}
                              onChange={() => toggle(item.id)}
                              id={`item-${item.id}`}
                              aria-label={`Select ${item.name}`}
                              className="peer sr-only"
                            />
                            <span
                              aria-hidden="true"
                              onClick={() => toggle(item.id)}
                              className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 transition ${
                                s?.checked
                                  ? `${meta.dot} border-transparent text-white`
                                  : 'border-border bg-background hover:border-primary/50'
                              }`}
                            >
                              {s?.checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
                            </span>

                            {/* Quantity + line total (only when selected) */}
                            {s?.checked && (
                              <div className="flex items-center gap-2 sm:gap-3">
                                <div className="flex items-center rounded-lg border border-border bg-background">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-r-none"
                                    onClick={() => setQty(item.id, s.qty - 1)}
                                    aria-label={`Decrease ${item.name} quantity`}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-6 text-center text-sm font-medium">
                                    {s.qty}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-l-none"
                                    onClick={() => setQty(item.id, s.qty + 1)}
                                    aria-label={`Increase ${item.name} quantity`}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <span className="w-16 text-right text-sm font-semibold sm:w-20">
                                  {formatINR(item.price * s.qty)}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-primary/20 bg-secondary px-4 py-3 text-sm">
              <span className="text-muted-foreground">Selected items: <strong className="text-foreground">{selectedCount}</strong></span>
              <span className="text-muted-foreground">Items total: <strong className="text-foreground">{formatINR(itemsTotal)}</strong></span>
            </div>
          </div>

          {/* Pandit selection */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">Select a Pandit</h2>
            <RadioGroup value={panditId} onValueChange={setPanditId} className="mt-4 space-y-3">
              <div
                className={`flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition has-[:checked]:border-primary has-[:checked]:bg-primary/5`}
              >
                <RadioGroupItem value="" id="p-no-pandit" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="p-no-pandit" className="cursor-pointer">
                    <p className="font-semibold">No Need</p>
                    <p className="text-xs text-muted-foreground">I will arrange the pandit myself</p>
                  </Label>
                </div>
                <span className="text-lg font-semibold text-muted-foreground">Free</span>
              </div>
              {pandits.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition has-[:checked]:border-primary has-[:checked]:bg-primary/5`}
                  >
                    <RadioGroupItem value={p.id} id={`p-${p.id}`} className="mt-1" />
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                      {p.photo_url && (
                        <Image src={p.photo_url} alt={p.name} fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`p-${p.id}`} className="cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{p.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.experience} yrs exp</span>
                              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-warning text-warning" /> {p.rating}</span>
                              <span className="flex items-center gap-1"><Languages className="h-3 w-3" /> {p.languages.join(', ')}</span>
                            </div>
                          </div>
                          <span className="text-lg font-semibold">{formatINR(p.price)}</span>
                        </div>
                        {p.bio && <p className="mt-2 text-xs text-muted-foreground">{p.bio}</p>}
                      </Label>
                    </div>
                  </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Summary sidebar */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-display text-lg font-semibold">Booking Summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items ({selectedCount})</span>
                <span>{formatINR(itemsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pandit</span>
                <span>{pandit ? formatINR(pandit.price) : '-'}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <Label htmlFor="date" className="text-xs">Booking Date</Label>
                <Input id="date" type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="time" className="text-xs">Preferred Time</Label>
                <Input id="time" type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="mt-1" />
              </div>
            </div>

            {cartItem ? (
              <div className="mt-5 flex h-12 items-center justify-between rounded-lg border border-primary bg-background overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full w-12 rounded-none hover:bg-primary/10 text-primary"
                  onClick={() => {
                    if (cartItem.quantity > 1) {
                      updateQty(cartItem.id, cartItem.quantity - 1);
                    } else {
                      removeItem(cartItem.id);
                      toast.success('Package removed from cart');
                    }
                  }}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-sm font-bold text-foreground select-none">{cartItem.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full w-12 rounded-none hover:bg-primary/10 text-primary"
                  onClick={() => updateQty(cartItem.id, cartItem.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleAddToCart} className="mt-5 w-full" size="lg">
                <ShoppingBag className="mr-2 h-4 w-4" /> Add Package to Cart
              </Button>
            )}

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> All samagri included</div>
              <div className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Experienced pandit</div>
              <div className="flex items-center gap-2"><Check className="h-3 w-3 text-success" /> Free rescheduling</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
