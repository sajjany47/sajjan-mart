'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Minus, Plus, ShoppingBag, Star, Check, Clock, Calendar, Languages } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import type { Puja, PujaItem, Pandit } from '@/lib/types';

interface Props {
  puja: Puja;
  items: PujaItem[];
  pandits: Pandit[];
}

export function PujaDetailClient({ puja, items, pandits }: Props) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Record<string, { checked: boolean; qty: number }>>(
    () =>
      Object.fromEntries(
        items.map((i) => [i.id, { checked: true, qty: i.default_qty }])
      )
  );
  const [panditId, setPanditId] = useState<string>('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  const pandit = pandits.find((p) => p.id === panditId);

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
    });
    toast.success(`${puja.name} package added to cart`);
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative aspect-[16/8] overflow-hidden rounded-2xl bg-muted">
            {puja.image_url && (
              <Image src={puja.image_url} alt={puja.name} fill priority sizes="100vw" className="object-cover" />
            )}
          </div>
          <h1 className="mt-6 font-display text-3xl font-semibold">{puja.name}</h1>
          <p className="mt-2 text-muted-foreground">{puja.description}</p>

          {/* Puja items */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-semibold">Required Puja Items</h2>
            <p className="text-sm text-muted-foreground">All items are selected by default. Uncheck or adjust quantities as needed.</p>
            <div className="mt-4 space-y-2">
              {items.map((item) => {
                const s = selected[item.id];
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition ${
                      s?.checked ? 'border-primary/40 bg-primary/5' : ''
                    }`}
                  >
                    <Checkbox checked={s?.checked} onCheckedChange={() => toggle(item.id)} id={`item-${item.id}`} />
                    <Label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatINR(item.price)} / {item.unit}
                      </span>
                    </Label>
                    {s?.checked && (
                      <div className="flex items-center rounded-lg border border-border">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(item.id, s.qty - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{s.qty}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(item.id, s.qty + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    {s?.checked && (
                      <span className="w-20 text-right text-sm font-medium">
                        {formatINR(item.price * s.qty)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary p-3 text-sm">
              <span>Selected items: <strong>{selectedCount}</strong></span>
              <span>Items total: <strong>{formatINR(itemsTotal)}</strong></span>
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

            <Button onClick={handleAddToCart} className="mt-5 w-full" size="lg">
              <ShoppingBag className="mr-2 h-4 w-4" /> Add Package to Cart
            </Button>

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
