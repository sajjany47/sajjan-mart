'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, X, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { FormikTextInput, FormikCheckBox, FormikSelect } from '@/components/FormikTextInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLoader } from '@/components/ui/page-loader';

interface EssentialImage {
  id: string;
  essential_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

interface Essential {
  id: string;
  name: string;
  category: string;
  stock_type: string | null;
  stock: number;
  price: number;
  is_active: boolean;
  created_at: string;
  essential_images?: EssentialImage[];
}

const CATEGORIES = [
  { value: 'food', label: 'Food' },
  { value: 'puja_samagri', label: 'Puja Samagri' },
  { value: 'natural', label: 'Natural Products' },
  { value: 'general', label: 'General' },
];

const STOCK_TYPES = [
  { value: 'piece', label: 'Piece' },
  { value: 'inch', label: 'Inch' },
  { value: 'gram', label: 'Gram' },
  { value: 'ml', label: 'ML' },
  { value: 'pack', label: 'Pack' },
];

function getInitialValues(editing: Essential | null) {
  if (editing) {
    return {
      name: editing.name,
      category: editing.category,
      stock_type: editing.stock_type ?? '',
      stock: editing.stock ?? 0,
      price: editing.price,
      is_active: editing.is_active,
    };
  }
  return {
    name: '',
    category: 'general',
    stock_type: 'piece',
    stock: 0,
    price: 0,
    is_active: true,
  };
}

function getValidationSchema() {
  return Yup.object().shape({
    name: Yup.string().trim().required('Name is required'),
    category: Yup.string().required('Category is required'),
    stock_type: Yup.string().required('Stock type is required'),
    stock: Yup.number().min(0, 'Stock cannot be negative').required('Stock is required'),
    price: Yup.number().min(0, 'Price cannot be negative').required('Price is required'),
    is_active: Yup.boolean(),
  });
}

type FormValues = ReturnType<typeof getInitialValues>;

export default function AdminEssentialsPage() {
  const [essentials, setEssentials] = useState<Essential[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Essential | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Essential | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('essentials')
      .select('*, essential_images(*)')
      .order('created_at', { ascending: false });
    setEssentials((data ?? []) as Essential[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setImages([]);
    setImageInputMode('url');
    setImageUrl('');
    setOpen(true);
  }

  function openEdit(e: Essential) {
    setEditing(e);
    setImages(e.essential_images?.map((img) => img.url) ?? []);
    setImageInputMode('url');
    setImageUrl('');
    setOpen(true);
  }

  function addImageUrl() {
    if (!imageUrl.trim()) return;
    if (images.includes(imageUrl)) { toast.error('Image already added'); return; }
    setImages([...images, imageUrl]);
    setImageUrl('');
  }

  function removeImage(idx: number) {
    setImages(images.filter((_, i) => i !== idx));
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'essentials');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Upload failed'); return; }
      if (images.includes(data.url)) { toast.error('Image already added'); return; }
      setImages([...images, data.url]);
      toast.success('Image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: FormValues, { setSubmitting }: any) {
    const payload = {
      name: values.name,
      category: values.category,
      stock_type: values.stock_type || null,
      stock: Number(values.stock) || 0,
      price: Number(values.price) || 0,
      is_active: values.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('essentials').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      await supabase.from('essential_images').delete().eq('essential_id', editing.id);
      for (let i = 0; i < images.length; i++) {
        await supabase.from('essential_images').insert({ essential_id: editing.id, url: images[i], alt: values.name, sort_order: i });
      }
      toast.success('Essential updated');
    } else {
      const { data, error } = await supabase.from('essentials').insert(payload).select('*').single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      for (let i = 0; i < images.length; i++) {
        await supabase.from('essential_images').insert({ essential_id: data.id, url: images[i], alt: values.name, sort_order: i });
      }
      toast.success('Essential created');
    }
    setOpen(false);
    setSubmitting(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('essential_images').delete().eq('essential_id', deleteTarget.id);
    const { error } = await supabase.from('essentials').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { toast.error(error.message); return; }
    load();
    toast.success('Essential deleted');
  }

  const filtered = essentials
    .filter((e) => categoryFilter === 'all' || e.category === categoryFilter)
    .filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <PageLoader text="Loading essentials..." />;

  const getCategoryLabel = (val: string) => CATEGORIES.find((c) => c.value === val)?.label ?? val;
  const getStockTypeLabel = (val: string | null) => STOCK_TYPES.find((s) => s.value === val)?.label ?? '-';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Essentials</h1>
          <p className="mt-1 text-sm text-muted-foreground">{essentials.length} total items</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search essentials..." className="pl-9" />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add Essential</Button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Essential</th>
              <th className="px-4 py-3 text-left font-medium">Category</th>
              <th className="px-4 py-3 text-left font-medium">Stock Type</th>
              <th className="px-4 py-3 text-left font-medium">Stock</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
            <tbody>
              {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No essentials found.</td></tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {e.essential_images?.[0]?.url && (
                          <Image src={e.essential_images[0].url} alt={e.name} fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <span className="font-medium">{e.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getCategoryLabel(e.category)}</td>
                  <td className="px-4 py-3">{getStockTypeLabel(e.stock_type)}</td>
                  <td className="px-4 py-3">{e.stock}</td>
                  <td className="px-4 py-3">{formatINR(e.price)}</td>
                  <td className="px-4 py-3">
                    <Badge className={e.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}>
                      {e.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(e)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Essential</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={getInitialValues(editing)}
            validationSchema={getValidationSchema()}
            enableReinitialize
            onSubmit={onSubmit}
          >
            {({ isSubmitting, values, setFieldValue }) => (
              <Form className="space-y-4">
                <EssentialFormContent
                  values={values}
                  setFieldValue={setFieldValue}
                  isEditing={!!editing}
                  images={images}
                  imageInputMode={imageInputMode}
                  setImageInputMode={setImageInputMode}
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  addImageUrl={addImageUrl}
                  removeImage={removeImage}
                  uploading={uploading}
                  uploadFile={uploadFile}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting || uploading}>
                    {isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Create essential'}
                  </Button>
                </DialogFooter>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Essential"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}

function EssentialFormContent({
  values, setFieldValue, isEditing,
  images, imageInputMode, setImageInputMode, imageUrl, setImageUrl,
  addImageUrl, removeImage, uploading, uploadFile,
}: {
  values: any;
  setFieldValue: any;
  isEditing: boolean;
  images: string[];
  imageInputMode: 'url' | 'upload';
  setImageInputMode: (m: 'url' | 'upload') => void;
  imageUrl: string;
  setImageUrl: (v: string) => void;
  addImageUrl: () => void;
  removeImage: (i: number) => void;
  uploading: boolean;
  uploadFile: (f: File) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">1</span>
          Basic Information
        </h3>
        <div className="space-y-3">
          <Field name="name" label="Name *" placeholder="Enter essential name" component={FormikTextInput} />
        </div>
      </div>

      {/* Category & Classification */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">2</span>
          Category & Classification
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field name="category" label="Category *" placeholder="Select category" options={CATEGORIES} component={FormikSelect} />
          <Field name="stock_type" label="Stock Type *" placeholder="Select stock type" options={STOCK_TYPES} component={FormikSelect} />
        </div>
      </div>

      {/* Pricing & Stock */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">3</span>
          Pricing & Stock
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field name="price" label="Price (Rs) *" type="number" component={FormikTextInput} />
          <Field name="stock" label="Stock *" type="number" component={FormikTextInput} />
        </div>
      </div>

      {/* Images */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">4</span>
          Images
        </h3>
        <div className="space-y-3">
          <div className="flex gap-1 rounded-md border border-input p-1 w-fit">
            <button type="button" onClick={() => setImageInputMode('url')} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${imageInputMode === 'url' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              <LinkIcon className="h-3 w-3" /> Paste URL
            </button>
            <button type="button" onClick={() => setImageInputMode('upload')} className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${imageInputMode === 'upload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              <Upload className="h-3 w-3" /> Upload File
            </button>
          </div>

          {imageInputMode === 'url' ? (
            <div className="flex gap-2">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL" className="flex-1" />
              <Button type="button" variant="outline" onClick={addImageUrl}><Plus className="h-4 w-4" /></Button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input p-6 text-center cursor-pointer hover:bg-muted/50 transition">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm font-medium text-foreground">{uploading ? 'Uploading...' : 'Click to upload'}</span>
                <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP, GIF, AVIF</p>
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
            </label>
          )}

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative group">
                  <Image src={url} alt="" width={80} height={80} className="h-20 w-20 rounded-lg border object-cover" />
                  <button type="button" onClick={() => removeImage(idx)} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow-sm">
                    <X className="h-3 w-3" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">Main</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">5</span>
          Status
        </h3>
        <Field name="is_active" label="Active" component={FormikCheckBox} />
      </div>
    </div>
  );
}
