'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Heart, MapPin, Ticket } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

export default function AccountOverview() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ orders: 0, wishlist: 0, addresses: 0, spent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('orders').select('total').eq('user_id', user.id),
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
      setLoading(false);
    });
  }, [user]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Welcome, {profile?.full_name ?? 'there'}!</h1>
      <p className="mt-1 text-sm text-muted-foreground">Here&apos;s an overview of your account.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, link: '/account/orders' },
          { label: 'Wishlist Items', value: stats.wishlist, icon: Heart, link: '/account/wishlist' },
          { label: 'Saved Addresses', value: stats.addresses, icon: MapPin, link: '/account/addresses' },
          { label: 'Total Spent', value: formatINR(stats.spent), icon: Ticket, link: '/account/orders' },
        ].map((s) => (
          <Link key={s.label} href={s.link}>
            <div className="rounded-xl border border-border bg-card p-4 transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-semibold">{loading ? '...' : s.value}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Quick Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/shop"><button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Browse Products</button></Link>
          <Link href="/puja"><button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Book a Puja</button></Link>
          <Link href="/account/support"><button className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Get Support</button></Link>
        </div>
      </div>
    </div>
  );
}
