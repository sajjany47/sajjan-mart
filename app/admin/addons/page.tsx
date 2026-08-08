'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatINR } from '@/lib/format';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { FormikTextInput, FormikCheckBox } from '@/components/FormikTextInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AddOnItem } from '@/lib/types';

function getInitialValues(editing: AddOnItem | null) {
  if (editing) {
    return {
      name: editing.name,
      price: editing.price,
      is_active: editing.is_active,
    };
  }
  return {
    name: '',
    price: 0,
    is_active: true,
  };
}

function getValidationSchema() {
  return Yup.object().shape({
    name: Yup.string().trim().required('Item name is required'),
    price: Yup.number().min(0, 'Price cannot be negative').required('Price is required'),
    is_active: Yup.boolean(),
  });
}

type FormValues = ReturnType<typeof getInitialValues>;

export default function AdminAddOnsPage() {
  const [items, setItems] = useState<AddOnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AddOnItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AddOnItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('add_on_items')
      .select('*')
      .order('created_at', { ascending: false });
    setItems((data ?? []) as AddOnItem[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(item: AddOnItem) {
    setEditing(item);
    setOpen(true);
  }

  async function onSubmit(values: FormValues, { setSubmitting }: any) {
    const payload = {
      name: values.name,
      price: Number(values.price) || 0,
      is_active: values.is_active,
    };

    if (editing) {
      const { error } = await supabase.from('add_on_items').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      toast.success('Add-on item updated');
    } else {
      const { error } = await supabase.from('add_on_items').insert(payload);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      toast.success('Add-on item created');
    }
    setOpen(false);
    setSubmitting(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('add_on_items').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { toast.error(error.message); return; }
    load();
    toast.success('Add-on item deleted');
  }

  const filtered = items.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()));

  if (loading) return <PageLoader text="Loading add-on items..." />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Add-On Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} total item{items.length === 1 ? '' : 's'}. These appear as optional extras on food products.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search add-on items..." className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add Add-On Item</Button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Item Name</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No add-on items found.</td></tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">{formatINR(a.price)}</td>
                  <td className="px-4 py-3">
                    <Badge className={a.is_active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(a)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Add-On Item</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={getInitialValues(editing)}
            validationSchema={getValidationSchema()}
            enableReinitialize
            onSubmit={onSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <Field name="name" label="Item Name *" placeholder="e.g. Extra Cheese" component={FormikTextInput} />
                <Field name="price" label="Price (Rs) *" type="number" placeholder="e.g. 40" component={FormikTextInput} />
                <Field name="is_active" label="Active" component={FormikCheckBox} />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editing ? 'Save changes' : 'Create item'}
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
        title="Delete Add-On Item"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? It will be removed from all linked products.`}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}