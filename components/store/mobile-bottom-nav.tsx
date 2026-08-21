'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Sparkles, ShoppingBag, ShoppingCart, User, ArrowRight } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { count, subtotal, couponDiscount } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Hide on admin routes or checkout
  if (pathname.startsWith('/admin') || pathname.startsWith('/checkout')) {
    return null;
  }

  const total = Math.max(0, subtotal - couponDiscount);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/puja', label: 'Puja & Pandit', icon: Sparkles, badge: 'Combo' },
    { href: '/shop', label: 'Shop', icon: ShoppingBag },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, countBadge: count },
    { href: '/account', label: 'Account', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none">
      <div className="pointer-events-auto flex flex-col">
        {/* Floating Mobile Sticky Cart Bar (if items in cart and not on /cart page) */}
        {count > 0 && pathname !== '/cart' && (
          <div className="mx-3 mb-2">
            <Link
              href="/cart"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-600 via-primary to-emerald-600 p-3 text-white shadow-xl backdrop-blur-md transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-white/20 text-xs font-bold px-2">
                  {count} {count === 1 ? 'item' : 'items'}
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-none">{formatINR(total)}</p>
                  <p className="text-[10px] text-white/80 leading-tight">Zero GST &amp; Zero Fees</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold">
                View Cart <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="flex items-center justify-around border-t border-border/80 bg-background/95 p-1.5 backdrop-blur-lg supports-[backdrop-filter]:bg-background/90 shadow-2xl">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center py-1.5 px-1 text-[10px] font-medium transition-all duration-200',
                  isActive ? 'text-primary font-bold scale-105' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className={cn('h-5 w-5 transition-transform', isActive && 'stroke-[2.5px]')} />
                  {item.countBadge && item.countBadge > 0 ? (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold text-primary-foreground shadow-sm">
                      {item.countBadge}
                    </span>
                  ) : null}
                  {item.badge && !isActive ? (
                    <span className="absolute -right-3 -top-2 flex rounded-full bg-amber-500/90 px-1 text-[8px] font-extrabold uppercase text-slate-950">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="mt-1 truncate">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 h-1 w-5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
