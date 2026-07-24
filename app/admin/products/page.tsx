'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR, slugify } from '@/lib/format';
import type { Product, Category } from '@/lib/types';

const EMPTY = {
  name: '',
  description: '',
  category_id: '',
  product_type: 'general' as Product['product_type'],
  base_price: 0,
  discount_percent: 0,
  is_featured: false,
  is_best_seller: false,
  is_popular: false,
  is_today_deal: false,
  is_active: true,
  image_url: '',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(EMPTY);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, category(*), product_images(*)')
      .order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }: any) => setCategories((data ?? []) as Category[]));
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY, category_id: categories[0]?.id ?? '' });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      category_id: p.category_id,
      product_type: p.product_type,
      base_price: p.base_price,
      discount_percent: p.discount_percent,
      is_featured: p.is_featured,
      is_best_seller: p.is_best_seller,
      is_popular: p.is_popular,
      is_today_deal: p.is_today_deal,
      is_active: p.is_active,
      image_url: p.product_images?.[0]?.url ?? '',
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.category_id) { toast.error('Name and category are required.'); return; }
    const slug = slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6);
    const { image_url, ...rest } = form;

    if (editing) {
      const { error } = await supabase.from('products').update({
        ...rest,
        slug: editing.slug,
        base_price: Number(rest.base_price),
        discount_percent: Number(rest.discount_percent),
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      if (image_url && image_url !== editing.product_images?.[0]?.url) {
        await supabase.from('product_images').delete().eq('product_id', editing.id);
        await supabase.from('product_images').insert({ product_id: editing.id, url: image_url, alt: editing.name, sort_order: 0 });
      }
      toast.success('Product updated');
    } else {
      const { data, error } = await supabase.from('products').insert({
        ...rest,
        slug,
        base_price: Number(rest.base_price),
        discount_percent: Number(rest.discount_percent),
      }).select('*').single();
      if (error) { toast.error(error.message); return; }
      if (image_url) {
        await supabase.from('product_images').insert({ product_id: data.id, url: image_url, alt: form.name, sort_order: 0 });
      }
      toast.success('Product created');
    }
    setOpen(false);
    load();
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    load();
    toast.success('Product deleted');
  }

  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
      </div>

      <div className="mt-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="pl-9" />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Product</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No products found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {p.product_images?.[0]?.url && (
                          <Image src={p.product_images[0].url} alt={p.name} fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? '-'}</td>
                  <td className="px-4 py-3">{formatINR(p.base_price)}</td>
                  <td className="px-4 py-3 capitalize">{p.product_type}</td>
                  <td className="px-4 py-3">
                    <Badge className={p.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div>
              <Label htmlFor="name" className="text-xs">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="desc" className="text-xs">Description</Label>
              <textarea
                id="desc"
                className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.product_type} onValueChange={(v) => setForm({ ...form, product_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="natural">Natural</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price" className="text-xs">Base Price (Rs)</Label>
                <Input id="price" type="number" min={0} value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="discount" className="text-xs">Discount %</Label>
                <Input id="discount" type="number" min={0} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="image" className="text-xs">Image URL</Label>
              <Input id="image" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: 'is_featured', l: 'Featured' },
                { k: 'is_best_seller', l: 'Best Seller' },
                { k: 'is_popular', l: 'Popular' },
                { k: 'is_today_deal', l: 'Today\'s Deal' },
                { k: 'is_active', l: 'Active' },
              ].map((f) => (
                <label key={f.k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form[f.k]}
                    onChange={(e) => setForm({ ...form, [f.k]: e.target.checked })}
                  />
                  {f.l}
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? 'Save changes' : 'Create product'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
