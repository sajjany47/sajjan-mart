'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StoreShell } from '@/components/store/store-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR, generateOrderNumber } from '@/lib/format';
import { toast } from 'sonner';
import type { Address } from '@/lib/types';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'razorpay' | 'cashfree'>('cod');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [newAddr, setNewAddr] = useState({ full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });

  const shipping = subtotal > 499 ? 0 : 49;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + shipping + tax;

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .then(({ data }: any) => {
        setAddresses((data ?? []) as Address[]);
        if (data && data.length > 0) setSelectedAddressId(data[0].id);
      });
  }, [user, items.length, router]);

  async function saveAddress() {
    if (!user) return;
    if (!newAddr.full_name || !newAddr.phone || !newAddr.line1 || !newAddr.city || !newAddr.state || !newAddr.pincode) {
      toast.error('Please fill all address fields.');
      return;
    }
    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...newAddr, user_id: user.id })
      .select('*')
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAddresses((prev) => [...prev, data as Address]);
    setSelectedAddressId(data.id);
    setNewAddr({ full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' });
    toast.success('Address saved');
  }

  async function placeOrder() {
    if (!user) return;
    if (!selectedAddressId && addresses.length === 0) {
      toast.error('Please add a delivery address.');
      return;
    }
    const address = addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];
    if (!address) {
      toast.error('Please select a delivery address.');
      return;
    }
    setLoading(true);
    const orderNumber = generateOrderNumber();
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: 'pending',
        subtotal,
        shipping,
        tax,
        total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'paid',
        address: address as any,
        notes,
      })
      .select('*')
      .single();

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId ?? null,
      puja_id: i.pujaId ?? null,
      pandit_id: i.panditId ?? null,
      name: i.name,
      variant_name: i.variantName ?? null,
      image_url: i.image ?? null,
      unit_price: i.price,
      quantity: i.quantity,
      total: i.price * i.quantity,
      item_type: i.type,
      metadata: { selectedItems: i.selectedItems ?? [], panditName: i.panditName } as any,
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      setLoading(false);
      toast.error(itemsError.message);
      return;
    }

    clearCart();
    setLoading(false);
    toast.success('Order placed successfully!');
    router.push(`/account/orders/${order.id}`);
  }

  if (!user) return null;

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <h1 className="font-display text-3xl font-semibold">Checkout</h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Address */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Delivery Address</h2>

              {addresses.length > 0 && (
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="mt-4 space-y-2">
                  {addresses.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <RadioGroupItem value={a.id} id={`addr-${a.id}`} className="mt-1" />
                      <Label htmlFor={`addr-${a.id}`} className="flex-1 cursor-pointer text-sm">
                        <span className="font-medium">{a.full_name}</span> · {a.phone}
                        <br />
                        {a.line1}, {a.line2 ? `${a.line2}, ` : ''}{a.city}, {a.state} - {a.pincode}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              <div className="mt-4 rounded-xl border border-dashed border-border p-4">
                <h3 className="text-sm font-semibold">Add new address</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="full_name" className="text-xs">Full Name</Label>
                    <Input id="full_name" value={newAddr.full_name} onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs">Phone</Label>
                    <Input id="phone" value={newAddr.phone} onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="line1" className="text-xs">Address Line 1</Label>
                    <Input id="line1" value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="line2" className="text-xs">Address Line 2 (optional)</Label>
                    <Input id="line2" value={newAddr.line2} onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs">City</Label>
                    <Input id="city" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-xs">State</Label>
                    <Input id="state" value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pincode" className="text-xs">Pincode</Label>
                    <Input id="pincode" value={newAddr.pincode} onChange={(e) => setNewAddr({ ...newAddr, pincode: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <Button variant="secondary" className="mt-3" onClick={saveAddress}>Save address</Button>
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)} className="mt-4 space-y-2">
                {[
                  { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
                  { value: 'razorpay', label: 'Razorpay', desc: 'Credit / Debit card, UPI, Netbanking' },
                  { value: 'cashfree', label: 'Cashfree', desc: 'Multiple payment options' },
                ].map((p) => (
                  <div key={p.value} className="flex items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <RadioGroupItem value={p.value} id={`pay-${p.value}`} className="mt-1" />
                    <Label htmlFor={`pay-${p.value}`} className="flex-1 cursor-pointer text-sm">
                      <span className="font-medium">{p.label}</span>
                      <br />
                      <span className="text-xs text-muted-foreground">{p.desc}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <p className="mt-3 text-xs text-muted-foreground">
                Note: This is a demo. No real payment will be processed.
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <Label htmlFor="notes" className="text-sm font-semibold">Order Notes (optional)</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special instructions..." className="mt-2" />
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg font-semibold">Order Summary</h2>
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
                {items.map((i) => (
                  <div key={i.id} className="flex justify-between text-sm">
                    <span className="pr-2">{i.name} x{i.quantity}</span>
                    <span className="whitespace-nowrap font-medium">{formatINR(i.price * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'Free' : formatINR(shipping)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (5%)</span><span>{formatINR(tax)}</span></div>
                <div className="border-t border-border pt-2 flex justify-between text-base font-semibold">
                  <span>Total</span><span>{formatINR(total)}</span>
                </div>
              </div>
              <Button onClick={placeOrder} disabled={loading} className="mt-5 w-full" size="lg">
                {loading ? 'Placing order...' : `Place Order · ${formatINR(total)}`}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </StoreShell>
  );
}
