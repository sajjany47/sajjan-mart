'use client';

import Link from 'next/link';
import { Utensils, Sparkles, Leaf, ShoppingCart } from 'lucide-react';

const CATEGORIES = [
  {
    id: 'food',
    name: 'Food & Meals',
    subtitle: 'Hot Dishes',
    href: '/category/food',
    icon: Utensils,
    gradient: 'from-orange-500 to-rose-500',
    badge: 'Hot',
    badgeBg: 'bg-rose-500 text-white',
  },
  {
    id: 'puja',
    name: 'Puja & Pandit',
    subtitle: 'Samagri + Pandit',
    href: '/puja',
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Pandit Ji',
    badgeBg: 'bg-amber-500 text-slate-950',
  },
  {
    id: 'natural',
    name: 'Spices & Oils',
    subtitle: 'Pure Natural',
    href: '/category/natural-products',
    icon: Leaf,
    gradient: 'from-emerald-500 to-teal-600',
    badge: '100% Pure',
    badgeBg: 'bg-emerald-500 text-white',
  },
  {
    id: 'general',
    name: 'Daily Essentials',
    subtitle: 'Home & Mart',
    href: '/category/general',
    icon: ShoppingCart,
    gradient: 'from-blue-500 to-indigo-600',
    badge: '₹0 Fees',
    badgeBg: 'bg-blue-500 text-white',
  },
];

export function CategoryQuickNav() {
  return (
    <div className="py-2">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.id}
              href={c.href}
              className="group flex flex-col items-center text-center p-2 rounded-2xl bg-card border border-border/60 transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-primary/30"
            >
              <div className="relative mb-1.5 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-md group-hover:shadow-lg transition-transform duration-300 group-hover:scale-110 text-white"
                style={{
                  backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
                }}
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${c.gradient} opacity-90`} />
                <Icon className="relative z-10 h-6 w-6 sm:h-7 sm:w-7 text-white drop-shadow" />

                {c.badge && (
                  <span className={`absolute -top-1.5 -right-1 z-20 rounded-full px-1.5 py-0.2 text-[9px] font-extrabold shadow-sm ${c.badgeBg}`}>
                    {c.badge}
                  </span>
                )}
              </div>

              <span className="text-xs font-bold text-foreground leading-tight truncate w-full">
                {c.name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate w-full hidden sm:block">
                {c.subtitle}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
