'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        setOrder((data as Order) ?? null);
        setLoading(false);
      });
  }, [user, id]);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  if (!order) return notFound();

  const addr = order.address as any;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Order #{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed on {new Date(order.created_at).toLocaleString()}</p>
        </div>
        <Badge className="bg-warning/15 text-warning capitalize">{order.status}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {order.order_items?.map((it) => (
            <div key={it.id} className="flex gap-4 rounded-xl border border-border bg-card p-3">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {it.image_url ? (
                  <Image src={it.image_url} alt={it.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{it.name}</p>
                {it.variant_name && <p className="text-xs text-muted-foreground">Variant: {it.variant_name}</p>}
                <p className="text-xs text-muted-foreground">{formatINR(Number(it.unit_price))} x {it.quantity}</p>
              </div>
              <span className="text-sm font-semibold">{formatINR(Number(it.total))}</span>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Payment</h2>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="uppercase">{order.payment_method}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{order.payment_status}</span></div>
            </div>
            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(Number(order.subtotal))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatINR(Number(order.shipping))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatINR(Number(order.tax))}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatINR(Number(order.total))}</span></div>
            </div>
          </div>

          {addr && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Delivery Address</h2>
              <p className="mt-2 text-sm">{addr.full_name} · {addr.phone}</p>
              <p className="text-sm text-muted-foreground">{addr.line1}, {addr.line2 ? `${addr.line2}, ` : ''}{addr.city}, {addr.state} - {addr.pincode}</p>
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="text-sm font-semibold">Notes</h2>
              <p className="mt-2 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
