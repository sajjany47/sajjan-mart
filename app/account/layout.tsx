'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { StoreShell } from '@/components/store/store-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { User, ShoppingBag, Heart, MapPin, Ticket, LifeBuoy, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const NAV = [
  { href: '/account', label: 'Overview', icon: LayoutDashboard },
  { href: '/account/profile', label: 'Profile', icon: User },
  { href: '/account/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/account/addresses', label: 'Addresses', icon: MapPin },
  { href: '/account/support', label: 'Support', icon: LifeBuoy },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login?redirect=/account');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <StoreShell>
        <div className="container-px mx-auto max-w-7xl py-6">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <div className="container-px mx-auto max-w-7xl py-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {(profile?.full_name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{profile?.full_name ?? 'User'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              {role === 'admin' && (
                <Link href="/admin" className="mt-3 block">
                  <button className="w-full rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15">
                    Go to Admin Panel
                  </button>
                </Link>
              )}
            </div>
            <nav className="mt-3 space-y-1">
              {NAV.map((n) => {
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                    }`}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
          <div>{children}</div>
        </div>
      </div>
    </StoreShell>
  );
}
