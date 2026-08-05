'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, MapPin, Home } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Address } from '@/lib/types';

const EMPTY = { full_name: '', phone: '', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false });
    setAddresses((data ?? []) as Address[]);
    setLoading(false);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My Addresses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your saved delivery addresses.</p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : <><Plus className="mr-1 h-4 w-4" /> Add address</>}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={save} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2">
          <div><Label htmlFor="full_name" className="text-xs">Full Name</Label><Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="phone" className="text-xs">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label htmlFor="line1" className="text-xs">Address Line 1</Label><Input id="line1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} className="mt-1" /></div>
          <div className="sm:col-span-2"><Label htmlFor="line2" className="text-xs">Address Line 2 (optional)</Label><Input id="line2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="city" className="text-xs">City</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="state" className="text-xs">State</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="mt-1" /></div>
          <div><Label htmlFor="pincode" className="text-xs">Pincode</Label><Input id="pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} className="mt-1" maxLength={6} /></div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">Save address</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Home className="h-8 w-8 text-primary" />
          </div>
          <p className="mt-4 font-medium">No addresses saved</p>
          <p className="mt-1 text-sm text-muted-foreground">Add a delivery address to checkout faster.</p>
          <Button onClick={() => setShowForm(true)} className="mt-5">
            <Plus className="mr-1 h-4 w-4" /> Add address
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{a.full_name} · {a.phone}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.line1}{a.line2 ? `, ${a.line2}` : ''}
                      <br />{a.city}, {a.state} - {a.pincode}
                    </p>
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-muted-foreground transition hover:text-destructive" aria-label="Remove address">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
