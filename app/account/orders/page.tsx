'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  packed: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
  return: 'bg-warning/15 text-warning',
  refunded: 'bg-muted text-muted-foreground',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold">My Orders</h1>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">You have no orders yet.</p>
          <Link href="/shop" className="mt-4"><button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start Shopping</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">My Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">{orders.length} order(s) total</p>

      <div className="mt-6 space-y-3">
        {orders.map((o) => (
          <Link key={o.id} href={`/account/orders/${o.id}`}>
            <div className="rounded-xl border border-border bg-card p-4 transition hover:shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Order #{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <Badge className={STATUS_COLORS[o.status] ?? 'bg-muted'}>{o.status}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {o.order_items?.length ?? 0} item(s) · {o.payment_method.toUpperCase()}
                </div>
                <span className="text-base font-semibold">{formatINR(Number(o.total))}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
