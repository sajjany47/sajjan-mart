export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function discountedPrice(salesPrice: number, discountPercent: number): number {
  return Math.round(salesPrice * (1 - discountPercent / 100));
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SM${ts}${rand}`;
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  cancel_request: 'Cancel Request',
  return: 'Return',
  refunded: 'Refunded',
};

export function orderStatusLabel(status: string | undefined): string {
  return (status && ORDER_STATUS_LABELS[status]) || status || 'Pending';
}
