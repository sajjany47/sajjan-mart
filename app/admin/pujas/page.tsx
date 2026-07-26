'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR, slugify } from '@/lib/format';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { Puja } from '@/lib/types';

const EMPTY = { name: '', description: '', image_url: '', base_price: 0 };

export default function AdminPujasPage() {
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Puja | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState<Puja | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    const { data } = await supabase.from('pujas').select('*').order('name');
    setPujas((data ?? []) as Puja[]);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(p: Puja) {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '', image_url: p.image_url ?? '', base_price: p.base_price });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error('Name required.'); return; }
    const slug = slugify(form.name);
    if (editing) {
      const { error } = await supabase.from('pujas').update({
        name: form.name, description: form.description, image_url: form.image_url, base_price: Number(form.base_price),
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Puja updated');
    } else {
      const { error } = await supabase.from('pujas').insert({
        name: form.name, slug, description: form.description, image_url: form.image_url, base_price: Number(form.base_price),
      });
      if (error) { toast.error(error.message); return; }
      toast.success('Puja created');
    }
    setOpen(false); load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('pujas').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { toast.error(error.message); return; }
    load(); toast.success('Puja deleted');
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pujas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pujas.length} pujas</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pujas.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{p.name}</p>
                <p className="text-xs text-muted-foreground">{formatINR(p.base_price)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Puja' : 'New Puja'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div><Label className="text-xs">Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Base Price (Rs)</Label><Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="mt-1" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Puja"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}
