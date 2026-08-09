'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, LifeBuoy } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { formatINR } from '@/lib/format';
import type { SupportTicket } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
};

export default function TicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', id)
        .single();
      setTicket((data as SupportTicket) ?? null);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <PageLoader text="Loading ticket..." />;
  if (!ticket) return <p className="text-sm text-muted-foreground">Ticket not found.</p>;

  const remarks = Array.isArray(ticket.remarks) ? ticket.remarks : [];

  return (
    <div>
      <Link href="/account/support" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ticket.ticket_number}
            {ticket.order && ` · Order #${ticket.order.order_number}`}
          </p>
        </div>
        <Badge className={STATUS_COLORS[ticket.status] ?? 'bg-muted text-muted-foreground'}>
          {ticket.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Issue description</p>
            <p className="text-xs text-muted-foreground">
              {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm">{ticket.message}</p>
        {ticket.order && (
          <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <span>Order: <strong>#{ticket.order.order_number}</strong></span>
            <span>Status: <strong>{ticket.order.status}</strong></span>
            <span>Total: <strong>{formatINR(Number(ticket.order.total))}</strong></span>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Updates</h2>
        {remarks.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No updates yet. Our team will respond shortly.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {remarks.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">{r.status.replace('_', ' ')}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()} · {r.by}
                  </span>
                </div>
                <p className="mt-2 text-sm">{r.remark}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}