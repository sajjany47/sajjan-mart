'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LifeBuoy, Plus, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { SupportTicket } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-warning/15 text-warning',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-success/15 text-success',
  closed: 'bg-muted text-muted-foreground',
};

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setTickets((data ?? []) as SupportTicket[]);
    setInitialLoading(false);
  }

  async function loadOrders() {
    if (!user) return;
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setOrders(data ?? []);
  }

  useEffect(() => {
    load();
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!orderId) { toast.error('Please select an order for this ticket.'); return; }
    if (!subject || !message) { toast.error('Please fill all fields.'); return; }
    setLoading(true);
    const { error } = await supabase
      .from('support_tickets')
      .insert({ user_id: user.id, order_id: orderId, subject, message });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setOrderId(''); setSubject(''); setMessage('');
    load();
    toast.success('Ticket submitted. We will get back to you soon.');
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">Submit a support ticket and our team will reach out.</p>
      </div>

      <form onSubmit={submit} className="mt-6 max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <Label htmlFor="order" className="text-xs">Order *</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select the order related to your issue" />
              </SelectTrigger>
              <SelectContent>
                {orders.length === 0 && (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No orders yet</div>
                )}
                {orders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    #{o.order_number} · {new Date(o.created_at).toLocaleDateString()} · {o.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subject" className="text-xs">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Briefly describe your issue" />
          </div>
          <div>
            <Label htmlFor="message" className="text-xs">Issue Description</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" placeholder="Share more details so we can help you faster" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="mt-5">
          {loading ? 'Submitting...' : 'Raise ticket'}
        </Button>
      </form>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold">Your Tickets</h2>
        {initialLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MessageSquareText className="h-7 w-7 text-primary" />
            </div>
            <p className="mt-3 font-medium">No tickets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your support requests will show up here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/account/support/${t.id}`}
                className="block rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LifeBuoy className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.ticket_number}
                        {t.order && ` · Order #${t.order.order_number}`}
                      </p>
                    </div>
                  </div>
                  <Badge className={STATUS_COLORS[t.status] ?? 'bg-muted text-muted-foreground'}>{t.status.replace('_', ' ')}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t.message}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  {t.remarks && t.remarks.length > 0 && ` · ${t.remarks.length} update(s)`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}