'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR, orderStatusLabel } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { Order } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  confirmed: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  processing: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  packed: 'bg-purple-100 text-purple-700 dark:text-purple-300',
  shipped: 'bg-indigo-100 text-indigo-700 dark:text-indigo-300',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
  cancel_request: 'bg-orange-100 text-orange-700 dark:text-orange-300',
  return: 'bg-warning/15 text-warning',
  refunded: 'bg-muted text-muted-foreground',
};

function payableAmount(o: Order): number {
  const refunded = Number(o.refunded_amount ?? 0);
  return Math.max(0, Number(o.total) - refunded);
}

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
      .then(({ data }: any) => {
        setOrders((data ?? []) as Order[]);
        setLoading(false);
      });
  }, [user]);

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold">My Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and manage all your orders.
        </p>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShoppingBag className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 font-medium">No orders yet</p>
          <p className="mt-1 text-sm text-muted-foreground">When you place an order, it will appear here.</p>
          <Link href="/shop" className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`} className="group block">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition group-hover:border-primary/40 group-hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Order #{o.order_number}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {new Date(o.created_at).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}>{orderStatusLabel(o.status)}</Badge>
                    <Badge variant="outline" className="uppercase">{o.payment_method}</Badge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <div className="text-sm text-muted-foreground">
                    {o.order_items?.length ?? 0} item(s)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{formatINR(payableAmount(o))}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
