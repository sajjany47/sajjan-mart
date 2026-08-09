'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, LifeBuoy, Send, MessageSquareText } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoader } from '@/components/ui/page-loader';
import { formatINR } from '@/lib/format';
import { toast } from 'sonner';
import type { SupportTicket } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
};

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();
    setTicket((data as SupportTicket) ?? null);
    if (data) setStatus((data as SupportTicket).status);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function submitRemark(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket) return;
    if (!remark.trim()) { toast.error('Please write a remark.'); return; }
    const prev = Array.isArray(ticket.remarks) ? ticket.remarks : [];
    const nextRemarks = [
      ...prev,
      {
        remark: remark.trim(),
        by: user?.email ?? 'Admin',
        createdAt: new Date().toISOString(),
        status,
      },
    ];
    setSaving(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({ status, remarks: nextRemarks })
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setRemark('');
    toast.success('Ticket updated.');
    load();
  }

  if (loading) return <PageLoader text="Loading ticket..." />;
  if (!ticket) return <p className="text-sm text-muted-foreground">Ticket not found.</p>;

  const remarks = (Array.isArray(ticket.remarks) ? ticket.remarks : []).slice().reverse();

  return (
    <div>
      <Link href="/admin/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">{ticket.subject}</h1>
            <p className="text-xs text-muted-foreground">
              {ticket.ticket_number} · raised on {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <Badge className={STATUS_COLORS[ticket.status] ?? 'bg-muted text-muted-foreground'}>
          {ticket.status.replace('_', ' ')}
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">Issue description</h2>
            <p className="mt-3 text-sm">{ticket.message}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Customer</h3>
              <p className="mt-2 text-sm font-medium">{ticket.user?.full_name ?? 'Unknown'}</p>
              <p className="text-xs text-muted-foreground">{ticket.user?.email}</p>
              {ticket.user?.phone && <p className="text-xs text-muted-foreground">{ticket.user.phone}</p>}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Related Order</h3>
              {ticket.order ? (
                <>
                  <p className="mt-2 text-sm font-medium">#{ticket.order.order_number}</p>
                  <p className="text-xs text-muted-foreground">Status: {ticket.order.status}</p>
                  <p className="text-xs text-muted-foreground">Total: {formatINR(Number(ticket.order.total))}</p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No order linked</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold">Remark History</h2>
            {remarks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No remarks added yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {remarks.map((r, i) => {
                  const when = (r as any).created_at ?? (r as any).createdAt;
                  return (
                    <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="secondary" className={STATUS_COLORS[(r as any).status]}>
                          {(r as any).status?.replace('_', ' ') ?? 'update'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {when ? new Date(when).toLocaleString() : ''} · {(r as any).by}
                        </span>
                      </div>
                      <p className="mt-2 text-sm">{(r as any).remark}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <form onSubmit={submitRemark} className="rounded-2xl border border-border bg-card p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MessageSquareText className="h-5 w-5" /> Update Ticket
            </h3>

            <div className="mt-4">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="mt-1 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-4">
              <Label htmlFor="remark" className="text-xs">Remark for this stage</Label>
              <Textarea id="remark" rows={4} value={remark} onChange={(e) => setRemark(e.target.value)} className="mt-1" placeholder="Add a remark visible to the customer..." />
            </div>

            <Button type="submit" disabled={saving} className="mt-4 w-full">
              {saving ? <span className="animate-pulse">Saving...</span> : <><Send className="mr-1 h-4 w-4" /> Add remark &amp; update status</>}
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}