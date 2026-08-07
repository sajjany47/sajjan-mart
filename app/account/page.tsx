'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, MapPin, IndianRupee, ArrowRight, Package, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
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
  return: 'bg-warning/15 text-warning',
  refunded: 'bg-muted text-muted-foreground',
};

function payableAmount(o: Order): number {
  const refunded = Number(o.refunded_amount ?? 0);
  return Math.max(0, Number(o.total) - refunded);
}

interface Stats {
  orders: number;
  wishlist: number;
  addresses: number;
  spent: number;
}

export default function AccountOverview() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ orders: 0, wishlist: 0, addresses: 0, spent: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('wishlist').select('id').eq('user_id', user.id),
      supabase.from('addresses').select('id').eq('user_id', user.id),
    ]).then(([o, w, a]) => {
      const orders = o.data ?? [];
      setStats({
        orders: orders.length,
        spent: orders.reduce((s: number, o: any) => s + Number(o.total), 0),
        wishlist: w.data?.length ?? 0,
        addresses: a.data?.length ?? 0,
      });
      setRecentOrders((orders as Order[]).slice(0, 3));
      setLoading(false);
    });
  }, [user]);

  const initials = (profile?.full_name ?? user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const cards = [
    { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, tint: 'bg-primary/10 text-primary', href: '/account/orders' },
    { label: 'Total Spent', value: formatINR(stats.spent), icon: IndianRupee, tint: 'bg-success/10 text-success', href: '/account/orders' },
    { label: 'Wishlist Items', value: stats.wishlist, icon: Heart, tint: 'bg-rose-500/10 text-rose-500', href: '/account/wishlist' },
    { label: 'Saved Addresses', value: stats.addresses, icon: MapPin, tint: 'bg-blue-500/10 text-blue-500', href: '/account/addresses' },
  ];

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary-foreground/80">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">
              Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'}!
            </h1>
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90"
          >
            <ShoppingBag className="h-4 w-4" /> Continue Shopping
          </Link>
          <Link
            href="/puja"
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
          >
            <Sparkles className="h-4 w-4" /> Book a Puja
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight">
              {loading ? <Skeleton className="h-7 w-20" /> : s.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders + quick links */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Orders</h2>
            <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
              <Package className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
              <Link href="/shop" className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {recentOrders.map((o) => (
                <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 transition hover:bg-accent/50">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">#{o.order_number}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.order_items?.length ?? 0} item(s) · {o.payment_method.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge className={STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}>{o.status}</Badge>
                    <span className="text-sm font-semibold">{formatINR(payableAmount(o))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              {[
                { href: '/shop', label: 'Browse Products' },
                { href: '/puja', label: 'Book a Puja' },
                { href: '/account/addresses', label: 'Manage Addresses' },
                { href: '/account/support', label: 'Get Support' },
              ].map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {a.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-success/15 to-primary/10 p-5">
            <h3 className="font-display text-base font-semibold">Need help?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Our support team is here to assist with your orders, deliveries, and puja bookings.
            </p>
            <Link href="/account/support" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Contact support <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
