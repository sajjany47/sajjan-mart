'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams, useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, Package, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { formatINR, orderStatusLabel } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import type { Order } from '@/lib/types';
import { computeOrderAmounts, type OrderAmounts } from '@/lib/order-refunds';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  confirmed: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  processing: 'bg-blue-100 text-blue-700 dark:text-blue-300',
  packed: 'bg-purple-100 text-purple-700 dark:text-purple-300',
  shipped: 'bg-indigo-100 text-indigo-700 dark:text-indigo-300',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
  cancel_request: 'bg-orange-100 text-orange-700 dark:text-orange-300',
  return: 'bg-warning/15 text-warning',
  refunded: 'bg-muted text-muted-foreground',
};

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'processing', 'packed'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSelection, setCancelSelection] = useState<string[]>([]);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        const o = (data as Order) ?? null;
        setOrder(o);
        // Pre-select the items the user already requested for cancellation.
        if (o?.cancel_request_items && o.cancel_request_items.length > 0) {
          setCancelSelection(o.cancel_request_items);
        }
        setLoading(false);
      });
  }, [user, id]);

  function toggleCancelItem(itemId: string) {
    setCancelSelection((prev) =>
      prev.includes(itemId) ? prev.filter((i) => i !== itemId) : [...prev, itemId]
    );
  }

  async function cancelOrder() {
    if (!id) return;
    if (cancelSelection.length === 0) {
      toast.error('Select at least one item to cancel.');
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: cancelSelection }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to cancel order');
        setCancelling(false);
        return;
      }
      setOrder((prev) => (prev ? { ...prev, status: 'cancel_request', cancel_requested_at: new Date().toISOString(), cancel_request_items: cancelSelection, previous_status: prev.status } : prev));
      setCancelOpen(false);
      toast.success('Cancellation requested. Waiting for admin approval.');
      router.refresh();
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!order) return notFound();

  const addr = order.address as any;
  const amt: OrderAmounts = computeOrderAmounts({
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    refundedAmount: order.refunded_amount ?? 0,
    paymentStatus: order.payment_status,
    items: (order.order_items ?? []).map((i) => ({
      id: i.id,
      total: i.total,
      cancelled: i.cancelled,
    })),
  } as any);
  const cancelledItems = (order.order_items ?? []).filter((i) => i.cancelled);
  const cancellable = CANCELLABLE_STATUSES.includes(order.status);
  const selectableItems = cancellable
    ? (order.order_items ?? []).filter((it) => !it.cancelled)
    : [];
  const cancelTotal = selectableItems
    .filter((it) => cancelSelection.includes(it.id))
    .reduce((sum, it) => sum + Number(it.total), 0);

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Order #{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on{' '}
            {new Date(order.created_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground'}>{orderStatusLabel(order.status)}</Badge>
          {cancellable && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelOpen(true)}
              disabled={cancelling || cancelSelection.length === 0}
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Cancel Order
            </Button>
          )}
        </div>
      </div>

      {order.status === 'cancel_request' && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          <Clock className="h-4 w-4" />
          Your cancellation request is pending admin approval.
          {order.cancel_requested_at ? (
            <span className="text-muted-foreground">
              {' '}Requested on {new Date(order.cancel_requested_at).toLocaleString()}.
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold">Items ({order.order_items?.length ?? 0})</h2>
          {cancellable && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-muted-foreground">
              Select the items you want to cancel, then press <span className="font-medium">Cancel Order</span>.
              The request will be sent to the admin for approval.
            </div>
          )}
          {order.order_items?.map((it) => (
            <div key={it.id} className={`flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm ${it.cancelled ? 'opacity-60' : ''}`}>
              {cancellable && !it.cancelled && (
                <div className="pt-6">
                  <Checkbox
                    checked={cancelSelection.includes(it.id)}
                    onCheckedChange={() => toggleCancelItem(it.id)}
                    aria-label={`Select ${it.name}`}
                  />
                </div>
              )}
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {it.image_url ? (
                  <Image src={it.image_url} alt={it.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{it.name}</p>
                {it.variant_name && <p className="text-xs text-muted-foreground">Variant: {it.variant_name}</p>}
                {(it.metadata?.addOns ?? []).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Adds: {(it.metadata?.addOns ?? []).map((a: any) => `${a.name} (+${formatINR(Number(a.price))})`).join(', ')}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{formatINR(Number(it.unit_price))} x {it.quantity}</p>
                {it.cancelled && (
                  <p className="mt-1 text-xs text-destructive">
                    {it.refunded ? 'Cancelled · Refunded' : 'Cancelled'}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-semibold">{formatINR(Number(it.total))}</span>
                {it.refunded && <Badge variant="outline" className="text-success">Refunded</Badge>}
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold">Payment</h2>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="uppercase">{order.payment_method}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{order.payment_status}</span></div>
            </div>
            <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(Number(order.subtotal))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shippingLabel(Number(order.shipping))}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatINR(Number(order.tax))}</span></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><span>Original total</span><span>{formatINR(amt.original_total)}</span></div>

              {amt.has_cancellation ? (
                <>
                  {cancelledItems.map((i) => (
                    <div key={i.id} className="flex justify-between text-xs text-destructive">
                      <span>Cancelled · {i.name}</span>
                      <span>−{formatINR(Number(i.total))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-primary">
                    <span>New order value</span>
                    <span>{formatINR(amt.fully_cancelled ? 0 : amt.updated_total)}</span>
                  </div>
                  {amt.is_prepaid_paid ? (
                    <>
                      {amt.refund_due_total > 0 && (
                        <div className="flex justify-between font-medium text-success">
                          <span>{amt.fully_cancelled ? 'Full refund' : 'Refund to your payment method'}</span>
                          <span>{formatINR(amt.refund_due_total)}</span>
                        </div>
                      )}
                      {amt.refunded_so_far > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Refunded so far</span>
                          <span>{formatINR(amt.refunded_so_far)}</span>
                        </div>
                      )}
                    </>
                  ) : !amt.fully_cancelled && (
                    <div className="mt-1 rounded-lg bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
                      Please pay {formatINR(amt.cod_collect)} at delivery
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-success">
                  <span>Amount to pay</span>
                  <span>{formatINR(amt.updated_total)}</span>
                </div>
              )}
            </div>
          </div>

          {addr && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-semibold">Delivery Address</h2>
              <p className="mt-3 text-sm">{addr.full_name} · {addr.phone}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} - {addr.pincode}
              </p>
            </div>
          )}

          {order.notes && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="font-display text-base font-semibold">Notes</h2>
              <p className="mt-2 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary/10 to-success/10 p-4">
            <Package className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              Need help with this order?{' '}
              <Link href="/account/support" className="font-medium text-primary hover:underline">Contact support</Link>
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel selected items?"
        description={`You are about to request cancellation of ${cancelSelection.length} item(s) worth ${formatINR(cancelTotal)} from order #${order.order_number}. The admin will review and approve before refund.`}
        confirmText="Request cancellation"
        onConfirm={cancelOrder}
        loading={cancelling}
      />
    </div>
  );
}

function shippingLabel(amount: number) {
  return amount === 0 ? 'Free' : formatINR(amount);
}
