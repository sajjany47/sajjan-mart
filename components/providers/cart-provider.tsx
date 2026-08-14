'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { CartItem } from '@/lib/types';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  count: number;
  subtotal: number;
  appliedCoupon: string | null;
  couponDiscount: number;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = 'sajjan-mart-cart';
const COUPON_KEY = 'sajjan-mart-coupon';

function addonKey(addOns?: { id: string; name: string; price: number }[]): string {
  return (addOns ?? []).map((a) => a.id).sort().join(',');
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    try {
      const couponRaw = localStorage.getItem(COUPON_KEY);
      if (couponRaw) {
        const parsed = JSON.parse(couponRaw);
        if (parsed && typeof parsed.code === 'string' && typeof parsed.discount === 'number') {
          setAppliedCoupon(parsed.code);
          setCouponDiscount(parsed.discount);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (appliedCoupon) {
      localStorage.setItem(COUPON_KEY, JSON.stringify({ code: appliedCoupon, discount: couponDiscount }));
    } else {
      localStorage.removeItem(COUPON_KEY);
    }
  }, [appliedCoupon, couponDiscount, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.type === item.type &&
          i.productId === item.productId &&
          i.pujaId === item.pujaId &&
          i.variantName === item.variantName &&
          i.panditId === item.panditId &&
          addonKey(i.addOns) === addonKey(item.addOns)
      );
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, id: generateId() }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
    setCouponDiscount(0);
  }, []);

  const applyCoupon = useCallback((code: string, discount: number) => {
    setAppliedCoupon(code);
    setCouponDiscount(discount);
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
  }, []);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, count, subtotal, appliedCoupon, couponDiscount, applyCoupon, removeCoupon }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
