export type PaymentMode = 'offline' | 'online' | 'both';

export interface StoreConfigShape {
  foodOpenTime: string;
  foodCloseTime: string;
  foodIsOpen: boolean;
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isWithinSchedule(now: Date, openTime: string, closeTime: string): boolean {
  const current = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  if (open === close) return true;
  if (open < close) return current >= open && current < close;
  return current >= open || current < close;
}

export function isFoodOpenNow(
  config: { foodIsOpen?: boolean; foodOpenTime?: string; foodCloseTime?: string; food_is_open?: boolean; food_open_time?: string; food_close_time?: string },
  now = new Date()
): boolean {
  const foodIsOpen = config.foodIsOpen ?? config.food_is_open ?? true;
  const foodOpenTime = config.foodOpenTime ?? config.food_open_time ?? '00:00';
  const foodCloseTime = config.foodCloseTime ?? config.food_close_time ?? '23:59';
  if (!foodIsOpen) return false;
  return isWithinSchedule(now, foodOpenTime, foodCloseTime);
}

export const PAYMENT_METHODS: Record<string, { value: string; label: string; desc: string }[]> = {
  offline: [
    { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
  ],
  online: [
    { value: 'razorpay', label: 'Razorpay', desc: 'Credit / Debit card, UPI, Netbanking' },
    { value: 'cashfree', label: 'Cashfree', desc: 'Multiple payment options' },
  ],
  both: [
    { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
    { value: 'razorpay', label: 'Razorpay', desc: 'Credit / Debit card, UPI, Netbanking' },
    { value: 'cashfree', label: 'Cashfree', desc: 'Multiple payment options' },
  ],
};

export function isPaymentModeAllowed(mode: string, method: string): boolean {
  if (mode === 'both') return true;
  const list = PAYMENT_METHODS[mode] ?? [];
  return list.some((p) => p.value === method);
}
