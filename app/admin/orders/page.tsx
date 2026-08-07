'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatINR } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Package, Inbox, XCircle, CheckCircle2, RefreshCcw, Truck } from 'lucide-react';
import { toast } from 'sonner';
import type { Order, OrderStatus } from '@/lib/types';
import { PageLoader } from '@/components/ui/page-loader';

type TabValue = 'new' | 'processing' | 'dispatch' | 'cancel' | 'completed';

interface TabDef {
  value: TabValue;
  label: string;
  statuses: OrderStatus[];
  empty: string;
}

const TAB_DEFS: TabDef[] = [
  { value: 'new', label: 'New Order', statuses: ['pending'], empty: 'No new orders awaiting approval.' },
  { value: 'processing', label: 'Processing', statuses: ['confirmed', 'processing', 'packed'], empty: 'No orders in processing.' },
  { value: 'dispatch', label: 'Dispatch', statuses: ['shipped'], empty: 'No orders out for dispatch.' },
  { value: 'cancel', label: 'Cancel Request', statuses: ['cancel_request'], empty: 'No cancellation requests.' },
  { value: 'completed', label: 'Completed', statuses: ['delivered', 'cancelled', 'return', 'refunded'], empty: 'No completed orders yet.' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  packed: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-success/15 text-success',
  cancelled: 'bg-destructive/15 text-destructive',
  cancel_request: 'bg-orange-100 text-orange-700 dark:text-orange-300',
  return: 'bg-warning/15 text-warning',
  refunded: 'bg-muted text-muted-foreground',
};

function payableAmount(order: Order): number {
  const refunded = Number(order.refunded_amount ?? 0);
  return Math.max(0, Number(order.total) - refunded);
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelSelection, setCancelSelection] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<TabValue>('new');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    setOrders((data ?? []) as Order[]);
    // Pre-select the items each user requested for cancellation.
    setCancelSelection((prev) => {
      const next = { ...prev };
      for (const o of (data ?? []) as Order[]) {
        if (o.status === 'cancel_request' && o.cancel_request_items && o.cancel_request_items.length > 0) {
          next[o.id] = o.cancel_request_items;
        }
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: OrderStatus) {
    setBusyId(id);
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Order marked as ${status}`);
    load();
  }

  async function approveCancel(id: string, selectedIds: string[]) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/cancel/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to approve cancellation'); return; }
      toast.success('Cancellation approved. Refund processed for selected items.');
      setCancelSelection((prev) => ({ ...prev, [id]: [] }));
      load();
    } catch {
      toast.error('Failed to approve cancellation');
    } finally {
      setBusyId(null);
    }
  }

  async function rejectCancel(id: string, itemIds?: string[]) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/cancel/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemIds && itemIds.length > 0 ? { item_ids: itemIds } : {}),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to reject cancellation'); return; }
      toast.success(itemIds && itemIds.length > 0 ? 'Item rejection submitted.' : 'Cancellation request rejected.');
      setCancelSelection((prev) => ({ ...prev, [id]: [] }));
      load();
    } catch {
      toast.error('Failed to reject cancellation');
    } finally {
      setBusyId(null);
    }
  }

  async function processItem(id: string, itemId: string, action: 'ready' | 'cancel') {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}/process-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, action }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to process item'); return; }
      toast.success(
        action === 'cancel'
          ? 'Item cancelled. Refund amount updated.'
          : 'Item marked ready.'
      );
      if (data.status === 'shipped') {
        toast.success('All items processed. Order moved to Dispatch.');
      }
      load();
    } catch {
      toast.error('Failed to process item');
    } finally {
      setBusyId(null);
    }
  }

  function toggleCancelItem(orderId: string, itemId: string) {
    setCancelSelection((prev) => {
      const current = prev[orderId] ?? [];
      const next = current.includes(itemId)
        ? current.filter((i) => i !== itemId)
        : [...current, itemId];
      return { ...prev, [orderId]: next };
    });
  }

  if (loading) return <PageLoader text="Loading orders..." />;

  const counts: Record<string, number> = {};
  for (const tab of TAB_DEFS) {
    counts[tab.value] = orders.filter((o) => tab.statuses.includes(o.status)).length;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, process and manage customer orders.</p>
        </div>
        <Button variant="outline" onClick={load}>Refresh</Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="mt-6">
        <TabsList className="h-auto flex-wrap gap-1">
          {TAB_DEFS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 px-4">
              {tab.label}
              <Badge variant="secondary" className="ml-0.5">{counts[tab.value]}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_DEFS.map((tab) => {
          const tabOrders = orders.filter((o) => tab.statuses.includes(o.status));
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-4 space-y-3">
              {tabOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
                  <Inbox className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">{tab.empty}</p>
                </div>
              ) : (
                tabOrders.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    tab={tab.value}
                    busy={busyId === o.id}
                    expanded={tab.value === 'cancel' || expandedId === o.id}
                    onToggleExpand={() => setExpandedId(expandedId === o.id ? null : o.id)}
                    onAccept={() => updateStatus(o.id, 'confirmed')}
                    onReject={() => updateStatus(o.id, 'cancelled')}
                    onMarkDispatch={() => updateStatus(o.id, 'shipped')}
                    onMarkDelivered={() => updateStatus(o.id, 'delivered')}
                    cancelSelected={cancelSelection[o.id] ?? []}
                    onToggleCancelItem={(itemId) => toggleCancelItem(o.id, itemId)}
                    onApproveCancel={() => approveCancel(o.id, cancelSelection[o.id] ?? [])}
                    onRejectCancel={() => rejectCancel(o.id)}
                    onApproveItem={(itemId) => approveCancel(o.id, [itemId])}
                    onRejectItem={(itemId) => rejectCancel(o.id, [itemId])}
                    onProcessItem={(itemId, action) => processItem(o.id, itemId, action)}
                  />
                ))
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

function OrderCard({
  order,
  tab,
  busy,
  expanded,
  onToggleExpand,
  onAccept,
  onReject,
  onMarkDispatch,
  onMarkDelivered,
  cancelSelected,
  onToggleCancelItem,
  onApproveCancel,
  onRejectCancel,
  onApproveItem,
  onRejectItem,
  onProcessItem,
}: {
  order: Order;
  tab: TabValue;
  busy: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onReject: () => void;
  onMarkDispatch: () => void;
  onMarkDelivered: () => void;
  cancelSelected: string[];
  onToggleCancelItem: (itemId: string) => void;
  onApproveCancel: () => void;
  onRejectCancel: () => void;
  onApproveItem: (itemId: string) => void;
  onRejectItem: (itemId: string) => void;
  onProcessItem: (itemId: string, action: 'ready' | 'cancel') => void;
}) {
  const addr = order.address as any;
  const items = order.order_items ?? [];
  const allItemsHandled = items.length > 0 && items.every((it) => it.ready || it.cancelled);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onToggleExpand} className="text-sm font-semibold hover:text-primary">
              Order #{order.order_number}
            </button>
            <Badge className={STATUS_COLORS[order.status] ?? 'bg-muted text-muted-foreground'}>{order.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()} · {items.length} item(s) ·{' '}
            {addr?.full_name ?? 'Unknown customer'} {addr?.phone ? `· ${addr.phone}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold">{formatINR(payableAmount(order))}</span>
          {Number(order.refunded_amount ?? 0) > 0 && (
            <span className="text-xs text-success">({formatINR(Number(order.total))} - refund)</span>
          )}
          {tab === 'new' && (
            <>
              <Button size="sm" variant="default" onClick={onAccept} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Accept
              </Button>
              <Button size="sm" variant="destructive" onClick={onReject} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                Reject
              </Button>
            </>
          )}
          {tab === 'processing' && (
            <Button size="sm" onClick={onMarkDispatch} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="mr-1 h-4 w-4" />}
              Mark Dispatched
            </Button>
          )}
          {tab === 'dispatch' && (
            <Button size="sm" onClick={onMarkDelivered} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="mr-1 h-4 w-4" />}
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
        <span className="uppercase">Payment: {order.payment_method}</span>
        <span className="capitalize">Payment status: {order.payment_status}</span>
        {order.refunded_amount != null && order.refunded_amount > 0 && (
          <span className="text-success">Refunded: {formatINR(Number(order.refunded_amount))}</span>
        )}
        {order.status === 'cancel_request' && (
          <span className="text-warning">Requested {order.cancel_requested_at ? new Date(order.cancel_requested_at).toLocaleString() : ''}</span>
        )}
        {tab === 'processing' && (
          <span>
            Progress: {items.filter((i) => i.ready || i.cancelled).length} / {items.length} items handled
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border p-4">
          <div className="space-y-2">
            {items.map((it) => {
              const cancelled = !!it.cancelled;
              const ready = !!it.ready;
              const requestedByUser = (order.cancel_request_items ?? []).includes(it.id);
              return (
                <div key={it.id} className={`flex items-center gap-3 rounded-xl border border-border p-3 ${cancelled ? 'opacity-60' : ''}`}>
                  {tab === 'cancel' && !cancelled && (
                    <Checkbox
                      checked={cancelSelected.includes(it.id)}
                      onCheckedChange={() => onToggleCancelItem(it.id)}
                      aria-label={`Select ${it.name}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatINR(Number(it.unit_price))} x {it.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {requestedByUser && tab === 'cancel' && !cancelled && (
                      <Badge variant="secondary" className="text-warning">Requested</Badge>
                    )}
                    {ready && <Badge variant="secondary" className="text-blue-700 dark:text-blue-300">Ready</Badge>}
                    {cancelled && <Badge variant="secondary">Cancelled</Badge>}
                    {!!it.refunded && <Badge variant="secondary" className="text-success">Refunded</Badge>}
                    <span className="text-sm font-semibold">{formatINR(Number(it.total))}</span>
                    {tab === 'cancel' && !cancelled && (
                      <>
                        <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={() => onApproveItem(it.id)} disabled={busy}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => onRejectItem(it.id)} disabled={busy}>
                          <XCircle className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </>
                    )}
                    {tab === 'processing' && !cancelled && !ready && (
                      <>
                        <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={() => onProcessItem(it.id, 'ready')} disabled={busy}>
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={() => onProcessItem(it.id, 'cancel')} disabled={busy}>
                          <XCircle className="mr-1 h-3 w-3" /> Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {addr && (
            <div className="mt-3 rounded-xl bg-muted/40 p-3 text-sm">
              <p className="font-medium">Delivery address</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {addr.full_name} · {addr.phone}<br />
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} - {addr.pincode}
              </p>
            </div>
          )}

          {tab === 'cancel' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="default" onClick={onApproveCancel} disabled={busy || cancelSelected.length === 0}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Approve selected
              </Button>
              <Button size="sm" variant="outline" onClick={onRejectCancel} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-1 h-4 w-4" />}
                Reject all
              </Button>
              {cancelSelected.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {cancelSelected.length} item(s) selected for refund
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
