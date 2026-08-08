'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderTree,
  Sparkles,
  Users,
  ClipboardList,
  Settings,
  PlusCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Skeleton } from '@/components/ui/skeleton';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/pujas', label: 'Pujas', icon: Sparkles },
  { href: '/admin/pandits', label: 'Pandits', icon: Users },
  { href: '/admin/addons', label: 'Add-Ons', icon: PlusCircle },
  { href: '/admin/essentials', label: 'Essentials', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login?redirect=/admin'); return; }
    if (role !== 'admin') { router.push('/account'); }
  }, [loading, user, role, router]);

  if (loading || !user || role !== 'admin') {
    return (
      <div className="container-px mx-auto max-w-7xl py-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container-px mx-auto flex max-w-7xl items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-sm font-bold">S</div>
            <span className="font-display text-lg font-semibold">Sajjan Mart Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
              <span className="inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Storefront</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container-px mx-auto max-w-7xl py-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside>
            <nav className="space-y-1">
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
    </div>
  );
}
