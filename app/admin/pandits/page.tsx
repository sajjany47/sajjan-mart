'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import type { Pandit } from '@/lib/types';

const EMPTY = { name: '', experience: 0, languages: '', rating: 5, price: 0, photo_url: '', bio: '' };

export default function AdminPanditsPage() {
  const [pandits, setPandits] = useState<Pandit[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pandit | null>(null);
  const [form, setForm] = useState<any>(EMPTY);

  async function load() {
    const { data } = await supabase.from('pandits').select('*').order('name');
    setPandits((data ?? []) as Pandit[]);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: Pandit) {
    setEditing(p);
    setForm({
      name: p.name, experience: p.experience, languages: p.languages.join(', '),
      rating: p.rating, price: p.price, photo_url: p.photo_url ?? '', bio: p.bio ?? '',
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error('Name required.'); return; }
    const langs = form.languages.split(',').map((s: string) => s.trim()).filter(Boolean);
    const payload = {
      name: form.name,
      experience: Number(form.experience),
      languages: langs,
      rating: Number(form.rating),
      price: Number(form.price),
      photo_url: form.photo_url,
      bio: form.bio,
    };
    if (editing) {
      const { error } = await supabase.from('pandits').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Pandit updated');
    } else {
      const { error } = await supabase.from('pandits').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Pandit created');
    }
    setOpen(false); load();
  }

  async function remove(p: Pandit) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.from('pandits').delete().eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    load(); toast.success('Pandit deleted');
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pandits</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pandits.length} pandits</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pandits.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-warning text-warning" /> {p.rating} · {p.experience} yrs
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.languages.join(', ')}</p>
                <p className="mt-1 text-sm font-medium">{formatINR(p.price)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(p)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            {p.bio && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.bio}</p>}
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Pandit' : 'New Pandit'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Experience (yrs)</Label><Input type="number" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Rating</Label><Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} className="mt-1" /></div>
            </div>
            <div><Label className="text-xs">Languages (comma separated)</Label><Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Price (Rs)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Photo URL</Label><Input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Bio</Label><Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
