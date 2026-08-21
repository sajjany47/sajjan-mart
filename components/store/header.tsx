'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ShoppingBag, Search, User, Menu, X, LayoutDashboard, LogOut, Heart, Sparkles, MapPin, AlertCircle, Compass, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useLocation } from '@/components/providers/location-provider';
import { supabase } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/format';
import { getFreeShippingThreshold } from '@/lib/store-config-utils';

const NAV = [
  { href: '/category/food', label: 'Food', category: 'food' },
  { href: '/puja', label: 'Puja Samagri' },
  { href: '/category/natural-products', label: 'Natural Products', category: 'natural-products' },
  { href: '/category/general', label: 'General', category: 'general' },
];

export function Header({ activeCategories }: { activeCategories: string[] }) {
  const { count } = useCart();
  const nav = NAV.filter((n) => !n.category || activeCategories.includes(n.category));
  const { user, profile, role, signOut } = useAuth();
  const { coords, address, distance, status, loading, detectLocation, setLocationByAddress } = useLocation();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);

  const [locDialogOpen, setLocDialogOpen] = useState(false);
  const [manualAddr, setManualAddr] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualAddr.trim()) return;
    setSearchLoading(true);
    const success = await setLocationByAddress(manualAddr);
    setSearchLoading(false);
    if (success) {
      setLocDialogOpen(false);
    }
  }

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }: any) => {
        if (data) setFreeShippingThreshold(getFreeShippingThreshold(data));
      });
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="bg-primary text-primary-foreground">
        <div className="container-px mx-auto flex max-w-7xl items-center justify-center py-1.5 text-xs text-center font-medium overflow-hidden">
          <Sparkles className="mr-1.5 h-3.5 w-3.5 shrink-0 text-amber-300 animate-pulse" />
          <span className="font-bold text-amber-300">0% GST • 0 PLATFORM FEES • 0 HIDDEN CHARGES</span>
          <span className="mx-2 text-primary-foreground/40 font-light">|</span>
          <span className="truncate">🛕 Puja Samagri Ke Sath Pandit Ji Booking Included!</span>
        </div>
      </div>

      <div className="container-px mx-auto flex max-w-7xl items-center gap-4 py-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="font-display text-xl">Sajjan Mart</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-lg font-bold">
            S
          </div>
          <span className="font-display text-xl font-semibold tracking-tight">Sajjan Mart</span>
        </Link>

        <form onSubmit={search} className="relative hidden flex-1 max-w-md md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, pujas, brands..."
            className="pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Location Trigger (Desktop) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocDialogOpen(true)}
            className={cn(
              "hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold md:flex transition-all",
              status === 'granted' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15",
              status === 'out_of_range' && "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15"
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">
              {status === 'granted'
                ? address?.split(',')[0] || 'Within Range'
                : status === 'out_of_range'
                ? 'Out of Range'
                : 'Set Location'}
            </span>
          </Button>

          {/* Location Trigger (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocDialogOpen(true)}
            className={cn(
              "flex md:hidden",
              status === 'granted' && "text-emerald-500",
              status === 'out_of_range' && "text-rose-500"
            )}
            aria-label="Location"
          >
            <MapPin className="h-5 w-5" />
          </Button>

          {/* Location Dialog Content */}
          <Dialog open={locDialogOpen} onOpenChange={setLocDialogOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-display text-lg">
                  <MapPin className="h-5 w-5 text-primary" /> Delivery Location
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Food items are delivered within a 6 km radius of our Kalighat kitchen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-3">
                <Button
                  onClick={async () => {
                    const success = await detectLocation();
                    if (success) setLocDialogOpen(false);
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Compass className="h-4 w-4" />
                  )}
                  Detect My Location
                </Button>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase tracking-wider">or enter address</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                <form onSubmit={handleAddressSubmit} className="space-y-2">
                  <Label htmlFor="address-search" className="text-xs font-semibold text-muted-foreground">Address / Pincode / Area</Label>
                  <div className="flex gap-2">
                    <Input
                      id="address-search"
                      placeholder="e.g. 700026, Kalighat, Kolkata"
                      value={manualAddr}
                      onChange={(e) => setManualAddr(e.target.value)}
                      disabled={searchLoading}
                      className="text-xs"
                    />
                    <Button type="submit" size="sm" disabled={searchLoading || loading} className="text-xs">
                      {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                    </Button>
                  </div>
                </form>

                {status !== 'pending' && (
                  <div className={cn(
                    "rounded-xl border p-3.5 text-xs space-y-1.5 shadow-sm transition-all",
                    status === 'granted' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-300",
                    status === 'out_of_range' && "bg-rose-500/5 border-rose-500/20 text-rose-900 dark:text-rose-300",
                    status === 'denied' && "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300"
                  )}>
                    <div className="flex items-center gap-2 font-semibold">
                      {status === 'granted' ? (
                        <>
                          <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Within Food Delivery Range</span>
                        </>
                      ) : status === 'out_of_range' ? (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                          <span>Outside Food Delivery Range</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                          <span>Location Access Denied</span>
                        </>
                      )}
                    </div>
                    {address && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground font-medium">Address:</strong> {address}
                      </p>
                    )}
                    {distance !== null && (
                      <p className="text-[11px] font-medium">
                        Distance: <span className="font-bold">{distance.toFixed(2)} km</span> (Limit: 6 km)
                      </p>
                    )}
                    {status === 'out_of_range' && (
                      <div className="space-y-1.5 mt-1">
                        <p className="text-[11px] text-rose-600/90 dark:text-rose-400/95 font-semibold">
                          🚫 Food order nahi kar sakte — range se bahar hai.
                        </p>
                        <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5">
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                            ✅ <strong>Natural Products, General &amp; Puja Samagri</strong> are available — no range limit.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Account">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{profile?.full_name || 'Account'}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">
                      <LayoutDashboard className="mr-2 h-4 w-4" /> {role === 'admin' ? 'Admin Panel' : 'My Account'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">
                      <ShoppingBag className="mr-2 h-4 w-4" /> Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/wishlist">
                      <Heart className="mr-2 h-4 w-4" /> Wishlist
                    </Link>
                  </DropdownMenuItem>
                  {role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin">
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/login">Sign in</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/register">Create account</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {mounted && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground shadow-sm">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav className="hidden border-t border-border bg-card md:block">
        <div className="container-px mx-auto flex max-w-7xl items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'px-3 py-2.5 text-sm font-medium transition-colors hover:text-primary',
                pathname === n.href && 'text-primary'
              )}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>

      <form onSubmit={search} className="container-px mx-auto max-w-7xl py-2 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="pl-9" />
        </div>
      </form>
    </header>
  );
}
