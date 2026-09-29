'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, ShoppingCart, LifeBuoy, Loader2, UserX, UserCheck, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatINR, orderStatusLabel } from '@/lib/format';
import type { Order, SupportTicket } from '@/lib/types';

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

const TICKET_COLORS: Record<string, string> = {
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
};

interface UserDetail {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    avatar_url: string | null;
    is_active: boolean;
    email_verified: string | null;
    created_at: string;
    _count: { orders: number; support_tickets: number; reviews: number; wishlists: number; addresses: number };
  };
  orders: Order[];
  tickets: SupportTicket[];
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(true);
        return;
      }
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleActive() {
    if (!data) return;
    setToggling(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.user.id, is_active: !data.user.is_active }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to update user status');
        return;
      }
      toast.success(data.user.is_active ? 'User deactivated' : 'User activated');
      setData((prev) => prev ? { ...prev, user: { ...prev.user, is_active: !prev.user.is_active } } : prev);
    } catch {
      toast.error('Failed to update user status');
    } finally {
      setToggling(false);
    }
  }

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  if (error || !data) return notFound();

  const u = data.user;
  const activeOrders = data.orders.filter((o) => !['cancelled', 'delivered'].includes(o.status));

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to users
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-semibold">{u.full_name ?? 'Unnamed user'}</h1>
              <Badge variant="secondary" className="capitalize">{u.role}</Badge>
              <Badge className={u.is_active ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}>
                {u.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {u.email}</span>
              {u.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {u.phone}</span>}
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(u.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {u.role !== 'admin' && (
          u.is_active ? (
            <Button variant="destructive" size="sm" onClick={toggleActive} disabled={toggling}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="mr-1 h-4 w-4" />} Deactivate
            </Button>
          ) : (
            <Button variant="default" size="sm" className="bg-success" onClick={toggleActive} disabled={toggling}>
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="mr-1 h-4 w-4" />} Activate
            </Button>
          )
        )}
      </div>

      {!u.is_active && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <UserX className="h-4 w-4" />
          This account is <strong>inactive</strong>. The user cannot log in or place orders until reactivated.
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total orders', value: u._count.orders, icon: ShoppingCart },
          { label: 'Support tickets', value: u._count.support_tickets, icon: LifeBuoy },
          { label: 'Addresses', value: u._count.addresses, icon: Calendar },
          { label: 'Active orders', value: activeOrders.length, icon: Inbox },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <s.icon className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-base font-semibold">Orders ({data.orders.length})</h2>
            <Link href="/admin/orders" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {data.orders.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.orders.map((o) => {
                const amt = (o as any).amounts;
                const cancelledCount = (o.order_items ?? []).filter((i) => i.cancelled).length;
                return (
                  <div key={o.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/orders`} className="text-sm font-semibold hover:text-primary">
                        #{o.order_number}
                      </Link>
                      <Badge className={STATUS_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}>{orderStatusLabel(o.status)}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {new Date(o.created_at).toLocaleString()} · {(o.order_items ?? []).length} item(s) · {o.payment_method.toUpperCase()} ({o.payment_status})
                      </span>
                      <span className="font-semibold text-foreground">
                        {amt && amt.has_cancellation ? (
                          <>
                            <span className="text-muted-foreground line-through">{formatINR(amt.original_total)}</span>{' '}
                            <span className="text-primary">{formatINR(amt.updated_total)}</span>
                            {cancelledCount > 0 && <span className="text-destructive"> ({cancelledCount} cancelled)</span>}
                          </>
                        ) : (
                          formatINR(Number(o.total))
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-base font-semibold">Support Tickets ({data.tickets.length})</h2>
            <Link href="/admin/tickets" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          {data.tickets.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tickets raised.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.tickets.map((t) => (
                <Link key={t.id} href={`/admin/tickets/${t.id}`} className="block px-4 py-3 transition hover:bg-accent/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{t.ticket_number}</span>
                    <Badge className={TICKET_COLORS[t.status] ?? 'bg-muted text-muted-foreground'}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                    {t.order ? ` · Order #${t.order.order_number}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}