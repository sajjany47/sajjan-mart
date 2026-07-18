'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, Users, IndianRupee, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, revenue: 0 });
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('total, status, created_at, order_number').order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
    ]).then(([p, o, c]) => {
      const orders = o.data ?? [];
      setStats({
        products: p.count ?? 0,
        orders: orders.length,
        customers: c.count ?? 0,
        revenue: orders.reduce((s, o) => s + Number(o.total), 0),
      });
      setRecent(orders);
      setLoading(false);
    });
  }, []);

  const CARDS = [
    { label: 'Total Products', value: stats.products, icon: Package, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: 'text-primary bg-primary/10' },
    { label: 'Customers', value: stats.customers, icon: Users, color: 'text-success bg-success/10' },
    { label: 'Revenue (recent)', value: formatINR(stats.revenue), icon: IndianRupee, color: 'text-warning bg-warning/10' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Overview of your store performance.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`inline-flex rounded-lg p-2 ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-semibold">{loading ? '...' : c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        <div className="mt-4 space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            recent.map((o) => (
              <div key={o.order_number} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">#{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-warning/15 text-warning capitalize">{o.status}</Badge>
                  <span className="text-sm font-semibold">{formatINR(Number(o.total))}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
