'use client';

import { useEffect, useState } from 'react';
import { LifeBuoy, Plus, MessageSquareText } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTickets(data ?? []);
    setInitialLoading(false);
  }

  useEffect(() => { load(); }, [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!subject || !message) { toast.error('Please fill all fields.'); return; }
    setLoading(true);
    const { error } = await supabase.from('support_tickets').insert({ user_id: user.id, subject, message });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSubject(''); setMessage('');
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
            <Label htmlFor="subject" className="text-xs">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" placeholder="Briefly describe your issue" />
          </div>
          <div>
            <Label htmlFor="message" className="text-xs">Message</Label>
            <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" placeholder="Share more details so we can help you faster" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="mt-5">
          {loading ? 'Submitting...' : 'Submit ticket'}
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
              <div key={t.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <LifeBuoy className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold">{t.subject}</p>
                  </div>
                  <Badge className={t.status === 'open' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}>{t.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t.message}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {new Date(t.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {new Date(t.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
