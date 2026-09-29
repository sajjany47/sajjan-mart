'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Heart,
  MapPin,
  IndianRupee,
  ArrowRight,
  Package,
  Sparkles,
  BookOpen,
  LifeBuoy,
  UserRound,
} from 'lucide-react';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const cards = [
    {
      label: 'Orders',
      value: stats.orders,
      icon: ShoppingBag,
      iconBg: 'bg-primary/10 text-primary',
      href: '/account/orders',
    },
    {
      label: 'Spent',
      value: formatINR(stats.spent),
      icon: IndianRupee,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      href: '/account/orders',
    },
    {
      label: 'Wishlist',
      value: stats.wishlist,
      icon: Heart,
      iconBg: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
      href: '/account/wishlist',
    },
    {
      label: 'Addresses',
      value: stats.addresses,
      icon: MapPin,
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      href: '/account/addresses',
    },
  ];

  const quickActions = [
    { href: '/shop', label: 'Browse Products', icon: ShoppingBag, tint: 'bg-primary/10 text-primary' },
    { href: '/puja', label: 'Book a Puja', icon: BookOpen, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { href: '/account/profile', label: 'My Profile', icon: UserRound, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    { href: '/account/support', label: 'Get Support', icon: LifeBuoy, tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  ];

  return (
    <div>
      {/* Hero — compact on mobile, rich on desktop */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 sm:rounded-3xl">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-56 w-56 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <div className="relative p-4 pb-12 sm:p-6 sm:pb-16 lg:p-8 lg:pb-20">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 font-display text-xl font-bold shadow-inner backdrop-blur sm:h-16 sm:w-16 sm:text-2xl">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              {mounted ? (
                <p className="text-xs font-medium text-primary-foreground/80 sm:text-sm">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              ) : (
                <p className="text-xs font-medium text-primary-foreground/80 opacity-0 sm:text-sm">&nbsp;</p>
              )}
              <h1 className="mt-0.5 truncate font-display text-xl font-bold sm:mt-1 sm:text-3xl">
                Welcome back, {firstName}!
              </h1>
              <p className="mt-0.5 hidden text-sm text-primary-foreground/70 sm:block">
                Here&apos;s what&apos;s happening with your account today.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-5 sm:gap-3">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-primary shadow-sm transition active:scale-[0.98] hover:bg-white/90"
            >
              <ShoppingBag className="h-4 w-4" /> Continue Shopping
            </Link>
            <Link
              href="/puja"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/15 px-3.5 py-2 text-sm font-semibold text-white backdrop-blur transition active:scale-[0.98] hover:bg-white/25"
            >
              <Sparkles className="h-4 w-4" /> Book a Puja
            </Link>
          </div>
        </div>
      </div>

      {/* Overlapping stat cards */}
      <div className="relative z-10 -mt-9 px-1 sm:-mt-12 sm:px-2">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {cards.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="group relative rounded-2xl border border-border bg-card p-3 shadow-md shadow-black/5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-4 lg:p-5"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${s.iconBg}`}>
                <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="mt-2.5 text-lg font-bold tracking-tight sm:mt-3 sm:text-2xl">
                {loading ? <Skeleton className="h-6 w-14 sm:h-7 sm:w-20" /> : s.value}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-sm">{s.label}</p>
              <ArrowRight className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/0 transition group-hover:translate-x-0.5 group-hover:text-primary max-sm:hidden" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent orders + quick links */}
      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold sm:text-lg">Recent Orders</h2>
            <Link
              href="/account/orders"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary transition hover:bg-primary/5 hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl sm:h-20" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-accent/30 py-8 text-center sm:py-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-6 w-6 text-primary/70" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
              <Link
                href="/shop"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                <ShoppingBag className="h-4 w-4" /> Start Shopping
              </Link>
            </div>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={`/account/orders/${o.id}`}
                  className="-mx-1 flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-accent/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">#{o.order_number}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {o.order_items?.length ?? 0} item(s) · {o.payment_method.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge className={STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}>{o.status}</Badge>
                    <span className="text-sm font-semibold">{formatINR(payableAmount(o))}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h2 className="font-display text-base font-semibold sm:text-lg">Quick Actions</h2>
            <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-1">
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-background/50 px-3.5 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.tint}`}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{a.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success/15 to-primary/10 p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-success/10 blur-2xl" />
            <h3 className="font-display text-base font-semibold">Need help?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Our support team is here to assist with your orders, deliveries, and puja bookings.
            </p>
            <Link
              href="/account/support"
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
            >
              Contact support <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
