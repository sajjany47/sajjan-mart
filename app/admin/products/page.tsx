'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, Search, X, Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR, slugify } from '@/lib/format';
import { Formik, Form, Field, FormikProps } from 'formik';
import * as Yup from 'yup';
import { FormikTextInput, FormikTextArea, FormikCheckBox, FormikSelect } from '@/components/FormikTextInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { Product, Category, Brand } from '@/lib/types';

const PRODUCT_TYPES = [
  { value: 'food', label: 'Food (Cloud Kitchen)' },
  { value: 'puja_samagri', label: 'Puja Samagri' },
  { value: 'natural', label: 'Natural Products' },
  { value: 'general', label: 'General' },
] as const;

const FOOD_TYPES = [
  { value: 'veg', label: 'Veg' },
  { value: 'non_veg', label: 'Non Veg' },
  { value: 'egg', label: 'Egg' },
];

const FOOD_CATEGORIES = [
  { value: 'pizza', label: 'Pizza' },
  { value: 'burger', label: 'Burger' },
  { value: 'biryani', label: 'Biryani' },
  { value: 'rolls_wraps', label: 'Rolls & Wraps' },
  { value: 'momos', label: 'Momos' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'fast_food', label: 'Fast Food' },
  { value: 'snacks', label: 'Snacks & Starters' },
  { value: 'desserts', label: 'Desserts & Ice Cream' },
  { value: 'beverages', label: 'Beverages & Shakes' },
  { value: 'other', label: 'Other' },
];

const QUANTITY_TYPES = [
  { value: 'piece', label: 'Piece' },
  { value: 'inch', label: 'Inch' },
  { value: 'gram', label: 'Gram' },
  { value: 'ml', label: 'ML' },
  { value: 'pack', label: 'Pack' },
];

const GENDER_TYPES = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'baby', label: 'Baby' },
  { value: 'men_women_both', label: 'Men & Women Both' },
  { value: 'all', label: 'All' },
];

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'food', label: 'Food' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'home', label: 'Home' },
  { value: 'sports', label: 'Sports' },
  { value: 'books', label: 'Books' },
  { value: 'toys', label: 'Toys' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'other', label: 'Other' },
];

const NATURAL_PRODUCT_CATEGORIES = [
  { value: 'fruits_vegetables', label: 'Fruits & Vegetables' },
  { value: 'oil_ghee', label: 'Oil & Ghee' },
  { value: 'masala_spices', label: 'Masala & Spices' },
  { value: 'noodles_pasta', label: 'Noodles & Pasta' },
  { value: 'grains_rice', label: 'Grains, Atta & Rice' },
  { value: 'dal_legumes', label: 'Dal & Legumes' },
  { value: 'honey_jaggery', label: 'Honey & Jaggery' },
  { value: 'dry_fruits', label: 'Dry Fruits & Nuts' },
  { value: 'dairy_bread', label: 'Dairy & Bread' },
  { value: 'snacks', label: 'Snacks & Namkeen' },
  { value: 'beverages', label: 'Beverages & Drinks' },
  { value: 'health_wellness', label: 'Health & Wellness' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_SLUG_MAP: Record<string, string> = {
  food: 'food',
  puja_samagri: 'puja-samagri',
  natural: 'natural-products',
  general: 'general',
};

function getInitialValues(productType: string, editing: Product | null, categories: Category[]) {
  const targetSlug = CATEGORY_SLUG_MAP[productType] ?? '';
  const matchedCategory = categories.find((c) => c.slug === targetSlug);

  if (editing) {
    return {
      name: editing.name,
      description: editing.description ?? '',
      product_type: editing.product_type,
      category_id: editing.category_id ?? matchedCategory?.id ?? '',
      sub_category_id: editing.sub_category_id ?? '',
      brand_id: editing.brand_id ?? '',
      purchase_price: editing.purchase_price,
      sales_price: editing.sales_price,
      discount_percent: editing.discount_percent,
      quantity_type: editing.quantity_type ?? '',
      quantity: editing.quantity ?? 0,
      stock_type: editing.stock_type ?? '',
      stock: editing.stock ?? 0,
      food_type: editing.food_type ?? '',
      gender: editing.gender ?? '',
      product_category: editing.product_category ?? '',
      is_featured: editing.is_featured,
      is_best_seller: editing.is_best_seller,
      is_popular: editing.is_popular,
      is_today_deal: editing.is_today_deal,
      is_active: editing.is_active,
    };
  }
  return {
    name: '',
    description: '',
    product_type: productType,
    category_id: matchedCategory?.id ?? '',
    sub_category_id: '',
    brand_id: '',
    purchase_price: 0,
    sales_price: 0,
    discount_percent: 0,
    quantity_type: '',
    quantity: 0,
    stock_type: '',
    stock: 0,
    food_type: '',
    gender: '',
    product_category: '',
    is_featured: false,
    is_best_seller: false,
    is_popular: false,
    is_today_deal: false,
    is_active: true,
  };
}

function getValidationSchema(productType: string) {
  return Yup.object().shape({
    name: Yup.string().trim().required('Product name is required'),
    description: Yup.string(),
    sales_price: Yup.number().min(1, 'Sales price must be greater than 0').required('Sales price is required'),
    purchase_price: Yup.number().min(0, 'Purchase price cannot be negative').required('Purchase price is required'),
    discount_percent: Yup.number().min(0).max(100).required(),
    quantity_type: Yup.string().required('Quantity type is required'),
    quantity: Yup.number().min(1, 'Quantity must be at least 1').required('Quantity is required'),
    stock_type: productType !== 'food' ? Yup.string().required('Stock type is required') : Yup.string(),
    stock: productType !== 'food' ? Yup.number().min(0, 'Stock cannot be negative').required('Stock is required') : Yup.number(),
    food_type: productType === 'food' ? Yup.string().required('Food type is required') : Yup.string(),
    category_id: Yup.string(),
    sub_category_id: Yup.string(),
    brand_id: Yup.string(),
    gender: Yup.string(),
    product_category: Yup.string(),
    is_featured: Yup.boolean(),
    is_best_seller: Yup.boolean(),
    is_popular: Yup.boolean(),
    is_today_deal: Yup.boolean(),
    is_active: Yup.boolean(),
  });
}

type FormValues = ReturnType<typeof getInitialValues>;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState('food');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setImages([]);
    setImageInputMode('url');
    setImageUrl('');
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setImages(p.product_images?.map((img) => img.url) ?? []);
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
      fd.append('folder', 'products');
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
    const slug = editing?.slug ?? slugify(values.name) + '-' + Math.random().toString(36).slice(2, 6);
    const payload = {
      name: values.name,
      description: values.description,
      productType: values.product_type,
      slug,
      categoryId: values.category_id || null,
      subCategoryId: values.sub_category_id || null,
      brandId: values.brand_id || null,
      purchasePrice: Number(values.purchase_price),
      salesPrice: Number(values.sales_price),
      discountPercent: Number(values.discount_percent),
      quantityType: values.quantity_type || null,
      quantity: Number(values.quantity) || null,
      stockType: values.stock_type || null,
      stock: Number(values.stock) || 0,
      foodType: values.food_type || null,
      gender: values.gender || null,
      productCategory: values.product_category || null,
      isFeatured: values.is_featured,
      isBestSeller: values.is_best_seller,
      isPopular: values.is_popular,
      isTodayDeal: values.is_today_deal,
      isActive: values.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      await supabase.from('product_images').delete().eq('product_id', editing.id);
      for (let i = 0; i < images.length; i++) {
        await supabase.from('product_images').insert({ product_id: editing.id, url: images[i], alt: values.name, sort_order: i });
      }
      toast.success('Product updated');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select('*').single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      for (let i = 0; i < images.length; i++) {
        await supabase.from('product_images').insert({ product_id: data.id, url: images[i], alt: values.name, sort_order: i });
      }
      toast.success('Product created');
    }
    setOpen(false);
    setSubmitting(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('products').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { toast.error(error.message); return; }
    load();
    toast.success('Product deleted');
  }

  const filtered = products
    .filter((p) => p.product_type === activeTab)
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <PageLoader text="Loading products..." />;

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
                    {(t.value === 'food' || t.value === 'general' || t.value === 'natural') && <th className="px-4 py-3 text-left font-medium">Category</th>}
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
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
                        {t.value === 'food' && <td className="px-4 py-3">{FOOD_TYPES.find((f) => f.value === p.food_type)?.label ?? p.food_type ?? '-'}</td>}
                        {(t.value === 'food' || t.value === 'general' || t.value === 'natural') && <td className="px-4 py-3 capitalize">{p.product_category?.replace(/_/g, ' ') ?? '-'}</td>}
                        <td className="px-4 py-3">
                          <Badge className={p.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}>
                            {p.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(p)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} {PRODUCT_TYPES.find((t) => t.value === (editing?.product_type ?? activeTab))?.label}</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={getInitialValues(editing?.product_type ?? activeTab, editing, categories)}
            validationSchema={getValidationSchema(editing?.product_type ?? activeTab)}
            enableReinitialize
            onSubmit={onSubmit}
          >
            {({ isSubmitting, values, setFieldValue }) => (
              <Form className="space-y-4">
                <ProductFormContent
                  values={values}
                  setFieldValue={setFieldValue}
                  categories={categories}
                  brands={brands}
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
                    {isSubmitting ? 'Saving...' : editing ? 'Save changes' : 'Create product'}
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
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}

function ProductFormContent({
  values, setFieldValue, categories, brands, isEditing,
  images, imageInputMode, setImageInputMode, imageUrl, setImageUrl,
  addImageUrl, removeImage, uploading, uploadFile,
}: {
  values: any;
  setFieldValue: any;
  categories: Category[];
  brands: Brand[];
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
  const pt = values.product_type;

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }));

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">1</span>
          Basic Information
        </h3>
        <div className="space-y-3">
          <Field name="name" label="Product Name *" placeholder="Enter product name" component={FormikTextInput} />
          <Field name="description" label="Description" placeholder="Enter product description" rows={3} component={FormikTextArea} />
        </div>
      </div>

      {/* Category & Classification */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">2</span>
          Category & Classification
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field name="category_id" label="Category" placeholder="Select category" options={categoryOptions} component={FormikSelect} disabled={!isEditing} />
            {pt === 'general' && (
              <Field name="brand_id" label="Brand" placeholder="Select brand" options={brandOptions} component={FormikSelect} />
            )}
            {pt === 'food' && (
              <Field name="product_category" label="Food Category" placeholder="Select food category" options={FOOD_CATEGORIES} component={FormikSelect} />
            )}
            {pt === 'natural' && (
              <Field name="product_category" label="Product Category" placeholder="Select category" options={NATURAL_PRODUCT_CATEGORIES} component={FormikSelect} />
            )}
          </div>

          {pt === 'food' && (
            <div className="grid grid-cols-2 gap-4">
              <Field name="food_type" label="Food Type *" placeholder="Select food type" options={FOOD_TYPES} component={FormikSelect} />
            </div>
          )}

          {pt === 'general' && (
            <div className="grid grid-cols-2 gap-4">
              <Field name="gender" label="Gender" placeholder="Select gender" options={GENDER_TYPES} component={FormikSelect} />
              <Field name="product_category" label="Product Category" placeholder="Select category" options={PRODUCT_CATEGORIES} component={FormikSelect} />
            </div>
          )}
        </div>
      </div>

      {/* Pricing */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">3</span>
          Pricing
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <Field name="purchase_price" label="Purchase Price (Rs) *" type="number" component={FormikTextInput} />
          <Field name="sales_price" label="Sales Price (Rs) *" type="number" component={FormikTextInput} />
          <Field name="discount_percent" label="Discount (%)" type="number" component={FormikTextInput} />
        </div>
      </div>

      {/* Quantity & Stock */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">4</span>
          Quantity & Stock
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Field name="quantity_type" label="Quantity Type *" placeholder="Select quantity type" options={QUANTITY_TYPES} component={FormikSelect} />
            <Field name="quantity" label="Quantity *" type="number" component={FormikTextInput} />
          </div>
          {pt !== 'food' && (
            <div className="grid grid-cols-2 gap-4">
              <Field name="stock_type" label="Stock Type *" placeholder="Select stock type" options={QUANTITY_TYPES} component={FormikSelect} />
              <Field name="stock" label="Stock *" type="number" component={FormikTextInput} />
            </div>
          )}
        </div>
      </div>

      {/* Images */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">5</span>
          Product Images
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

      {/* Status & Flags */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">6</span>
          Status & Visibility
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          <Field name="is_active" label="Active" component={FormikCheckBox} />
          <Field name="is_featured" label="Featured" component={FormikCheckBox} />
          <Field name="is_best_seller" label="Best Seller" component={FormikCheckBox} />
          <Field name="is_popular" label="Popular" component={FormikCheckBox} />
          <Field name="is_today_deal" label="Today's Deal" component={FormikCheckBox} />
        </div>
      </div>
    </div>
  );
}
