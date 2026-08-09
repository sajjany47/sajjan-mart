'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LifeBuoy, Search, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/ui/page-loader';
import type { SupportTicket } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    setTickets((data ?? []) as SupportTicket[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      t.subject.toLowerCase().includes(needle) ||
      t.ticket_number.toLowerCase().includes(needle) ||
      (t.user?.email ?? '').toLowerCase().includes(needle) ||
      (t.order?.order_number ?? '').toLowerCase().includes(needle)
    );
  });

  const counts: Record<string, number> = { all: tickets.length };
  for (const t of tickets) counts[t.status] = (counts[t.status] ?? 0) + 1;

  if (loading) return <PageLoader text="Loading tickets..." />;

  const tabs = ['all', 'open', 'in_progress', 'resolved', 'closed'];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Support Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tickets.length} total ticket{tickets.length === 1 ? '' : 's'} from customers.
          </p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setStatusFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${
                statusFilter === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {t === 'in_progress' ? 'In Progress' : t.charAt(0).toUpperCase() + t.slice(1)} ({counts[t] ?? 0})
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets..." className="pl-9" />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Ticket</th>
              <th className="px-4 py-3 text-left font-medium">Subject</th>
              <th className="px-4 py-3 text-left font-medium">Customer</th>
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No tickets found.</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{t.ticket_number}</td>
                  <td className="px-4 py-3 max-w-[240px] truncate">{t.subject}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{t.user?.full_name ?? t.user?.email ?? 'Unknown'}</div>
                    {t.user?.email && t.user.email !== t.user?.full_name && (
                      <div className="text-xs text-muted-foreground">{t.user.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.order && <Link href={`/admin/orders`} className="text-primary hover:underline">#{t.order.order_number}</Link>}
                    {!t.order && <span className="text-muted-foreground">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLORS[t.status] ?? 'bg-muted text-muted-foreground'}>
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                    <div className="text-xs">{new Date(t.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/tickets/${t.id}`}>
                      <Button variant="outline" size="sm"><Eye className="mr-1 h-4 w-4" /> View</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}