'use client';

import { useEffect, useState } from 'react';
import { LifeBuoy, Plus } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setTickets(data ?? []);
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
      <h1 className="font-display text-2xl font-semibold">Support</h1>
      <p className="mt-1 text-sm text-muted-foreground">Submit a support ticket and our team will reach out.</p>

      <form onSubmit={submit} className="mt-6 max-w-md space-y-3 rounded-xl border border-border bg-card p-5">
        <div>
          <Label htmlFor="subject" className="text-xs">Subject</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="message" className="text-xs">Message</Label>
          <Textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1" />
        </div>
        <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit ticket'}</Button>
      </form>

      <div className="mt-6 space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{t.subject}</p>
              <Badge className={t.status === 'open' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}>{t.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
          </div>
        ))}
        {tickets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <LifeBuoy className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No tickets yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
