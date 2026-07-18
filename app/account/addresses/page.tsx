'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Address } from '@/lib/types';

const EMPTY = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false });
    setAddresses((data ?? []) as Address[]);
  }

  useEffect(() => { load(); }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name || !form.phone || !form.line1 || !form.city || !form.state || !form.pincode) {
      toast.error('Please fill all required fields.');
      return;
    }
    const { error } = await supabase.from('addresses').insert({ ...form, user_id: user.id });
    if (error) { toast.error(error.message); return; }
    setForm(EMPTY);
    setShowForm(false);
    load();
    toast.success('Address saved');
  }

  async function remove(id: string) {
    await supabase.from('addresses').delete().eq('id', id);
    load();
    toast.success('Address removed');
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">My Addresses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your saved delivery addresses.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <div><Label htmlFor="full_name" className="text-xs">Full Name</Label><Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="phone" className="text-xs">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label htmlFor="line1" className="text-xs">Address Line 1</Label><Input id="line1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label htmlFor="line2" className="text-xs">Address Line 2 (optional)</Label><Input id="line2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="city" className="text-xs">City</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="state" className="text-xs">State</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="pincode" className="text-xs">Pincode</Label><Input id="pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit">Save address</Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{a.full_name} · {a.phone}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.line1}, {a.line2 ? `${a.line2}, ` : ''}{a.city}, {a.state} - {a.pincode}
                  </p>
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {addresses.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No addresses yet. Click &quot;Add&quot; to create one.</p>
        )}
      </div>
    </div>
  );
}
