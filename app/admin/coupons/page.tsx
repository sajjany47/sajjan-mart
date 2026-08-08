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
import { FormikTextInput, FormikTextArea, FormikCheckBox } from '@/components/FormikTextInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { Coupon } from '@/lib/types';

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function getInitialValues(editing: Coupon | null) {
  if (editing) {
    return {
      code: editing.code,
      description: editing.description ?? '',
      discount_percent: editing.discount_percent,
      max_discount: editing.max_discount,
      min_order: editing.min_order,
      valid_until: toDateInputValue(editing.valid_until),
      is_active: editing.is_active,
      is_one_time: editing.is_one_time,
    };
  }
  return {
    code: '',
    description: '',
    discount_percent: 10,
    max_discount: 100,
    min_order: 0,
    valid_until: '',
    is_active: true,
    is_one_time: false,
  };
}

function getValidationSchema() {
  return Yup.object().shape({
    code: Yup.string().trim().required('Coupon code is required'),
    description: Yup.string(),
    discount_percent: Yup.number().min(0, 'Must be 0-100').max(100, 'Must be 0-100').required('Discount % is required'),
    max_discount: Yup.number().min(0, 'Cannot be negative').required('Max discount is required'),
    min_order: Yup.number().min(0, 'Cannot be negative').required('Min order is required'),
    valid_until: Yup.string(),
    is_active: Yup.boolean(),
    is_one_time: Yup.boolean(),
  });
}

type FormValues = ReturnType<typeof getInitialValues>;

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    setCoupons((data ?? []) as Coupon[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(c: Coupon) {
    setEditing(c);
    setOpen(true);
  }

  async function onSubmit(values: FormValues, { setSubmitting }: any) {
    const payload = {
      code: values.code.trim().toUpperCase(),
      description: values.description,
      discount_percent: Number(values.discount_percent) || 0,
      max_discount: Number(values.max_discount) || 0,
      min_order: Number(values.min_order) || 0,
      valid_until: values.valid_until ? new Date(values.valid_until + 'T23:59:59').toISOString() : null,
      is_active: values.is_active,
      is_one_time: values.is_one_time,
    };

    if (editing) {
      const { error } = await supabase.from('coupons').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      toast.success('Coupon updated');
    } else {
      const { error } = await supabase.from('coupons').insert(payload);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      toast.success('Coupon created');
    }
    setOpen(false);
    setSubmitting(false);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('coupons').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { toast.error(error.message); return; }
    load();
    toast.success('Coupon deleted');
  }

  const isExpired = (c: Coupon) => c.valid_until && new Date(c.valid_until).getTime() < Date.now();

  const filtered = coupons.filter((c) =>
    c.code.toLowerCase().includes(q.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(q.toLowerCase())
  );

  if (loading) return <PageLoader text="Loading coupons..." />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Coupons</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {coupons.length} total coupon{coupons.length === 1 ? '' : 's'}. Customers can apply these at checkout.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coupons..." className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Add Coupon</Button>
      </div>

      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Discount</th>
              <th className="px-4 py-3 text-left font-medium">Max Discount</th>
              <th className="px-4 py-3 text-left font-medium">Min Order</th>
              <th className="px-4 py-3 text-left font-medium">Usage</th>
              <th className="px-4 py-3 text-left font-medium">Valid Until</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No coupons found.</td></tr>
            ) : (
              filtered.map((c) => {
                const expired = isExpired(c);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold">{c.code}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.description ?? '-'}</td>
                    <td className="px-4 py-3">{c.discount_percent}%</td>
                    <td className="px-4 py-3">{formatINR(c.max_discount)}</td>
                    <td className="px-4 py-3">{formatINR(c.min_order)}</td>
                    <td className="px-4 py-3">
                      {c.is_one_time ? (
                        <Badge variant="secondary">One-Time</Badge>
                      ) : (
                        <span className="text-muted-foreground">Repeat</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'No expiry'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        expired
                          ? 'bg-muted text-muted-foreground'
                          : c.is_active
                            ? 'bg-success/15 text-success'
                            : 'bg-destructive/15 text-destructive'
                      }>
                        {expired ? 'Expired' : c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(c)} aria-label="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'Add'} Coupon</DialogTitle>
          </DialogHeader>
          <Formik
            initialValues={getInitialValues(editing)}
            validationSchema={getValidationSchema()}
            enableReinitialize
            onSubmit={onSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Field name="code" label="Coupon Code *" placeholder="e.g. WELCOME10" component={FormikTextInput} />
                  <Field name="discount_percent" label="Discount (%) *" type="number" component={FormikTextInput} />
                </div>
                <Field name="description" label="Description" placeholder="e.g. 10% off on first order" rows={2} component={FormikTextArea} />
                <div className="grid grid-cols-2 gap-4">
                  <Field name="max_discount" label="Max Discount (Rs) *" type="number" component={FormikTextInput} />
                  <Field name="min_order" label="Min Order (Rs) *" type="number" component={FormikTextInput} />
                </div>
                <Field name="valid_until" label="Valid Until" type="date" component={FormikTextInput} />
                <Field name="is_active" label="Active" component={FormikCheckBox} />
                <div className="rounded-lg border border-border p-3">
                  <Field name="is_one_time" label="One-Time Use (can be used only once per customer)" component={FormikCheckBox} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    If enabled, this coupon can be applied to only one order per customer.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Save changes' : 'Create coupon'}
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
        title="Delete Coupon"
        description={`Are you sure you want to delete coupon "${deleteTarget?.code}"?`}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </div>
  );
}