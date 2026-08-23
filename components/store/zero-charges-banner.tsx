'use client';

import { Percent, Receipt, BadgePercent, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ZeroChargesBannerProps {
  variant?: 'full' | 'compact';
  hideButton?: boolean;
}

export function ZeroChargesBanner({ variant = 'full', hideButton = false }: ZeroChargesBannerProps) {
  if (variant === 'compact') {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2.5">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <BadgePercent className="h-4 w-4 text-emerald-600" />
            Transparent Pricing
          </span>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            0% Hidden Fees
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <BadgePercent className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <span>Zero GST</span>
                <XCircle className="h-3 w-3 text-rose-500 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">No GST added at checkout</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Receipt className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <span>Zero Tax</span>
                <XCircle className="h-3 w-3 text-rose-500 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">Prices inclusive of all taxes</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl bg-background/80 p-2.5 border border-border/50">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Percent className="h-3.5 w-3.5 rotate-12" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <span>No Platform Fees</span>
                <XCircle className="h-3 w-3 text-rose-500 shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">No convenience charges</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-4 md:mb-8 md:p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
      {/* Decorative background glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 flex-1">
          {/* Card 1: NO GST */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-3 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
              <BadgePercent className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">Zero GST</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                No extra GST at checkout.
              </p>
            </div>
          </div>

          {/* Card 2: NO TAX */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-3 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">Zero Tax</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                Prices inclusive of all taxes.
              </p>
            </div>
          </div>

          {/* Card 3: NO PLATFORM FEES */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 p-3 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
              <Percent className="h-4 w-4 rotate-12 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-foreground">No Fees</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                No convenience platform fees.
              </p>
            </div>
          </div>
        </div>

        {!hideButton && (
          <Link href="/shop" className="shrink-0 self-center md:self-auto">
            <Button size="sm" className="h-9 px-4 text-xs sm:h-10 sm:px-6 sm:text-sm font-semibold">
              Start Shopping <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
