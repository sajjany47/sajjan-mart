'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2, Pencil, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR, slugify } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PujaImportDialog } from '@/components/admin/puja-import-dialog';
import type { Puja } from '@/lib/types';

interface PujaSamagriProduct {
  id: string;
  name: string;
  sales_price: number;
  quantity_type: string | null;
}

const EMPTY = { name: '', description: '', image_url: '', base_price: 0, is_active: true };

export default function AdminPujasPage() {
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [products, setProducts] = useState<PujaSamagriProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Puja | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Puja | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const [pujasRes, productsRes] = await Promise.all([
      supabase.from('pujas').select('*').order('name'),
      supabase.from('products').select('id,name,sales_price,quantity_type').eq('product_type', 'puja_samagri').eq('active', 'true').order('name'),
    ]);
    setPujas((pujasRes.data ?? []) as Puja[]);
    setProducts((productsRes.data ?? []) as PujaSamagriProduct[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() { setEditing(null); setForm(EMPTY); setSelectedItems([]); setOpen(true); }

  async function openEdit(p: Puja) {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? '', image_url: p.image_url ?? '', base_price: p.base_price, is_active: p.is_active });
    const { data } = await supabase.from('puja_items').select('*').eq('puja_id', p.id);
    setSelectedItems((data ?? []).map((i: any) => i.product_id).filter(Boolean));
    setOpen(true);
  }

  function toggleItem(id: string) {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  useEffect(() => {
    const total = products
      .filter((p) => selectedItems.includes(p.id))
      .reduce((sum, p) => sum + p.sales_price, 0);
    setForm((prev: any) => ({ ...prev, base_price: total }));
  }, [selectedItems, products]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error('Name required.'); return; }
    setSaving(true);
    const slug = slugify(form.name);
    let pujaId = editing?.id ?? '';

    if (editing) {
      const { error } = await supabase.from('pujas').update({
        name: form.name, description: form.description, image_url: form.image_url, base_price: Number(form.base_price), is_active: form.is_active,
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success('Puja updated');
    } else {
      const { data, error } = await supabase.from('pujas').insert({
        name: form.name, slug, description: form.description, image_url: form.image_url, base_price: Number(form.base_price), is_active: form.is_active,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
      pujaId = data?.id ?? '';
      toast.success('Puja created');
    }

    if (pujaId) {
      await supabase.from('puja_items').delete().eq('puja_id', pujaId);
      const selected = products.filter((p) => selectedItems.includes(p.id));
      for (let i = 0; i < selected.length; i++) {
        await supabase.from('puja_items').insert({
          puja_id: pujaId,
          product_id: selected[i].id,
          name: selected[i].name,
          unit: selected[i].quantity_type ?? 'pc',
          price: selected[i].sales_price,
          default_qty: 1,
          sort_order: i + 1,
        });
      }
    }

    setSaving(false); setOpen(false); load();
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

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/export/pujas');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error ?? 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pujas.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <PageLoader text="Loading pujas..." />;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pujas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pujas.length} pujas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting} title="Download pujas.xlsx (Pujas + Puja Items sheets) — edit it in Excel and re-upload it here">
            <FileSpreadsheet className="mr-1 h-4 w-4 text-success" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <PujaImportDialog
            onImported={load}
            title="Import pujas & puja items from Excel — existing names update, new names are added. Follow the 3-step wizard."
          />
          <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add</Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pujas.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="relative aspect-[16/9] bg-muted">
              {p.image_url && (
                <Image src={p.image_url} alt={p.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatINR(p.base_price)}</p>
                  <Badge className={`mt-2 ${p.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Puja' : 'New Puja'}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label className="text-xs">Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <div className="sm:col-span-2"><Label className="text-xs">Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Base Price (Rs)</Label><Input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="mt-1" /><p className="mt-1 text-xs text-muted-foreground">Auto-set from selected items total</p></div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="puja-active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="puja-active" className="text-sm font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs">Puja Samagri Items</Label>
              <div className="mt-2 grid grid-cols-1 gap-1 rounded-lg border border-border p-2 sm:grid-cols-2">
                {products.length === 0 && (
                  <p className="col-span-full px-2 py-4 text-center text-xs text-muted-foreground">No puja samagri products found. Add them under Products.</p>
                )}
                {products.map((p) => {
                  const checked = selectedItems.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm transition ${checked ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(p.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span>{p.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatINR(p.sales_price)}</span>
                    </label>
                  );
                })}
              </div>
              {products.length > 0 && (
                <div className="mt-1 flex gap-3 text-xs">
                  <button type="button" onClick={() => setSelectedItems(products.map((p) => p.id))} className="text-primary font-medium">Select all</button>
                  <button type="button" onClick={() => setSelectedItems([])} className="text-muted-foreground">Clear</button>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{selectedItems.length} of {products.length} items selected · Total {formatINR(products.filter((p) => selectedItems.includes(p.id)).reduce((sum, p) => sum + p.sales_price, 0))}</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : editing ? 'Save' : 'Create'}
              </Button>
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
