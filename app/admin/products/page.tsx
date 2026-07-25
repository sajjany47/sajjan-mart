'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, X, Upload, Link } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR, slugify } from '@/lib/format';
import type { Product, Category, Brand } from '@/lib/types';

const PRODUCT_TYPES = [
  { value: 'food', label: 'Food (Cloud Kitchen)' },
  { value: 'puja_samagri', label: 'Puja Samagri' },
  { value: 'natural', label: 'Natural Products' },
  { value: 'general', label: 'General' },
] as const;

const FOOD_TYPES = ['veg', 'non_veg', 'egg'];
const QUANTITY_TYPES = ['piece', 'inch', 'gram', 'ml', 'pack'];
const GENDER_TYPES = ['men', 'women', 'baby', 'men_women_both', 'all'];
const PRODUCT_CATEGORIES = ['electronics', 'fashion', 'food', 'beauty', 'home', 'sports', 'books', 'toys', 'automotive', 'other'];

function emptyForm(productType: string) {
  return {
    name: '', description: '', product_type: productType,
    category_id: '', sub_category_id: '', brand_id: '',
    purchase_price: 0, sales_price: 0, discount_percent: 0,
    quantity_type: '', quantity: 0,
    food_type: '', gender: '', product_category: '',
    is_featured: false, is_best_seller: false, is_popular: false, is_today_deal: false, is_active: true,
    images: [] as string[],
    imageInputMode: 'url' as 'url' | 'upload',
    imageUrl: '',
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState('food');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<any>(emptyForm('food'));

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, category(*), sub_category(*), brand(*), product_images(*)')
      .order('created_at', { ascending: false });
    setProducts((data ?? []) as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.from('categories').select('*').order('sort_order').then(({ data }: any) => setCategories((data ?? []) as Category[]));
    supabase.from('brands').select('*').order('name').then(({ data }: any) => setBrands((data ?? []) as Brand[]));
    load();
  }, [load]);

  function openNew(type: string) {
    setEditing(null);
    setForm({ ...emptyForm(type), category_id: categories[0]?.id ?? '' });
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? '', product_type: p.product_type,
      category_id: p.category_id ?? '', sub_category_id: p.sub_category_id ?? '', brand_id: p.brand_id ?? '',
      purchase_price: p.purchase_price, sales_price: p.sales_price, discount_percent: p.discount_percent,
      quantity_type: p.quantity_type ?? '', quantity: p.quantity ?? 0,
      food_type: p.food_type ?? '', gender: p.gender ?? '', product_category: p.product_category ?? '',
      is_featured: p.is_featured, is_best_seller: p.is_best_seller, is_popular: p.is_popular, is_today_deal: p.is_today_deal, is_active: p.is_active,
      images: p.product_images?.map((img) => img.url) ?? [],
      imageInputMode: 'url' as const,
      imageUrl: '',
    });
    setOpen(true);
  }

  function addImage() {
    if (!form.imageUrl.trim()) return;
    if (form.images.includes(form.imageUrl)) { toast.error('Image already added'); return; }
    setForm({ ...form, images: [...form.images, form.imageUrl], imageUrl: '' });
  }

  function removeImage(idx: number) {
    setForm({ ...form, images: form.images.filter((_: string, i: number) => i !== idx) });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error('Product name is required.'); return; }
    if (Number(form.sales_price) <= 0) { toast.error('Sales price must be greater than 0.'); return; }

    const slug = editing?.slug ?? slugify(form.name) + '-' + Math.random().toString(36).slice(2, 6);
    const payload = {
      name: form.name, description: form.description, productType: form.product_type, slug,
      categoryId: form.category_id || null, subCategoryId: form.sub_category_id || null, brandId: form.brand_id || null,
      purchasePrice: Number(form.purchase_price), salesPrice: Number(form.sales_price), discountPercent: Number(form.discount_percent),
      quantityType: form.quantity_type || null, quantity: Number(form.quantity) || null,
      foodType: form.food_type || null, gender: form.gender || null, productCategory: form.product_category || null,
      isFeatured: form.is_featured, isBestSeller: form.is_best_seller, isPopular: form.is_popular, isTodayDeal: form.is_today_deal, isActive: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      await supabase.from('product_images').delete().eq('product_id', editing.id);
      for (let i = 0; i < form.images.length; i++) {
        await supabase.from('product_images').insert({ product_id: editing.id, url: form.images[i], alt: editing.name, sort_order: i });
      }
      toast.success('Product updated');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('*').single();
      if (error) { toast.error(error.message); return; }
      for (let i = 0; i < form.images.length; i++) {
        await supabase.from('product_images').insert({ product_id: data.id, url: form.images[i], alt: form.name, sort_order: i });
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

  const filtered = products
    .filter((p) => p.product_type === activeTab)
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const categoriesForType = activeTab === 'food'
    ? categories.filter((c) => ['food'].includes(c.slug))
    : activeTab === 'natural'
    ? categories.filter((c) => ['natural-products'].includes(c.slug))
    : activeTab === 'puja_samagri'
    ? categories.filter((c) => ['puja-samagri'].includes(c.slug))
    : categories;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">{products.length} total products</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <div className="flex items-center justify-between">
          <TabsList>
            {PRODUCT_TYPES.map((t) => {
              const count = products.filter((p) => p.product_type === t.value).length;
              return (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
            <Button onClick={() => openNew(activeTab)}><Plus className="mr-1 h-4 w-4" /> Add {PRODUCT_TYPES.find((t) => t.value === activeTab)?.label}</Button>
          </div>
        </div>

        {PRODUCT_TYPES.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Product</th>
                    <th className="px-4 py-3 text-left font-medium">Price</th>
                    <th className="px-4 py-3 text-left font-medium">Purchase</th>
                    <th className="px-4 py-3 text-left font-medium">Discount</th>
                    {t.value === 'food' && <th className="px-4 py-3 text-left font-medium">Type</th>}
                    {t.value === 'general' && <th className="px-4 py-3 text-left font-medium">Category</th>}
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No products found.</td></tr>
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
                            <div>
                              <span className="font-medium">{p.name}</span>
                              <p className="text-xs text-muted-foreground">{p.category?.name ?? p.sub_category?.name ?? '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{formatINR(p.sales_price)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatINR(p.purchase_price)}</td>
                        <td className="px-4 py-3">{p.discount_percent > 0 ? `${p.discount_percent}%` : '-'}</td>
                        {t.value === 'food' && <td className="px-4 py-3 capitalize">{p.food_type ?? '-'}</td>}
                        {t.value === 'general' && <td className="px-4 py-3 capitalize">{p.product_category ?? '-'}</td>}
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
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} {PRODUCT_TYPES.find((t) => t.value === form.product_type)?.label}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <ProductFormFields form={form} setForm={setForm} categories={categories} brands={brands} addImage={addImage} removeImage={removeImage} />
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

function ProductFormFields({ form, setForm, categories, brands, addImage, removeImage }: any) {
  const pt = form.product_type;
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Product Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter product name" className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Description</Label>
          <textarea className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>

      {(pt === 'food' || pt === 'general') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: Category) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {pt === 'general' && (
            <div>
              <Label className="text-xs">Brand</Label>
              <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b: Brand) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {pt === 'food' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Food Type *</Label>
            <Select value={form.food_type} onValueChange={(v) => setForm({ ...form, food_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {FOOD_TYPES.map((ft) => <SelectItem key={ft} value={ft}>{ft.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {pt === 'general' && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {GENDER_TYPES.map((g) => <SelectItem key={g} value={g}>{g.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Product Category</Label>
            <Select value={form.product_category} onValueChange={(v) => setForm({ ...form, product_category: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map((pc) => <SelectItem key={pc} value={pc}>{pc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Brand</Label>
            <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>
                {brands.map((b: Brand) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Purchase Price (Rs) *</Label>
          <Input type="number" min={0} value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Sales Price (Rs) *</Label>
          <Input type="number" min={0} value={form.sales_price} onChange={(e) => setForm({ ...form, sales_price: e.target.value })} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Discount (%)</Label>
          <Input type="number" min={0} max={100} value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Quantity Type</Label>
          <Select value={form.quantity_type} onValueChange={(v) => setForm({ ...form, quantity_type: v })}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {QUANTITY_TYPES.map((qt) => <SelectItem key={qt} value={qt}>{qt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Quantity</Label>
          <Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-xs">Images</Label>
        <div className="mt-1 flex gap-2">
          <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Paste image URL" className="flex-1" />
          <Button type="button" variant="outline" onClick={addImage}><Plus className="h-4 w-4" /></Button>
        </div>
        {form.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.images.map((url: string, idx: number) => (
              <div key={idx} className="relative group">
                <Image src={url} alt="" width={80} height={80} className="h-20 w-20 rounded-md border object-cover" />
                <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { k: 'is_featured', l: 'Featured' },
          { k: 'is_best_seller', l: 'Best Seller' },
          { k: 'is_popular', l: 'Popular' },
          { k: 'is_today_deal', l: "Today's Deal" },
          { k: 'is_active', l: 'Active' },
        ].map((f) => (
          <label key={f.k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.checked })} />
            {f.l}
          </label>
        ))}
      </div>
    </>
  );
}
