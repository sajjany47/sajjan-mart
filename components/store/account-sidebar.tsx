'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { User, ShoppingBag, Heart, MapPin, Ticket, LifeBuoy, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/support', label: 'Support', icon: Ticket },
];

export function AccountSidebar() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login?redirect=/account');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="hidden lg:block">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-3 w-36" />
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {NAV.map((n) => (
                <Skeleton key={n.href} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {NAV.map((n) => (
            <Skeleton key={n.href} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      </aside>
    );
  }

  const initials = (profile?.full_name ?? user.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const renderNav = (itemClass: string) =>
    NAV.map((n) => {
      const active =
        pathname === n.href ||
        (n.href !== '/account' && pathname.startsWith(n.href));
      return (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
            active
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            itemClass
          )}
        >
          <n.icon className="h-4 w-4" />
          {n.label}
        </Link>
      );
    });

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="hidden lg:block">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-lg font-bold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
        <nav className="mt-3 space-y-1 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {renderNav('')}
        </nav>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 lg:hidden">
        <div className="flex w-max gap-2">
          {NAV.map((n) => {
            const active =
              pathname === n.href ||
              (n.href !== '/account' && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
