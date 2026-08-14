'use client';

import { ShieldCheck, Percent, Receipt, BadgePercent, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ZeroChargesBanner() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-5 md:p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
      {/* Decorative background glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-md">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Sajjan Mart Promise</span>
          </div>
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
            100% Honest & Flat Pricing
          </h2>
          <p className="text-xs text-muted-foreground">
            No hidden charges, no surprise fees at checkout. What you see is exactly what you pay.
          </p>
          <Link href="/shop" className="inline-block pt-1">
            <Button size="sm" className="h-8">
              Start Shopping <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:flex-1 max-w-2xl">
          {/* Card 1: NO GST */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3.5 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground">Zero GST</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                No GST added at checkout.
              </p>
            </div>
          </div>

          {/* Card 2: NO TAX */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3.5 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground">Zero Tax</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prices inclusive of all taxes.
              </p>
            </div>
          </div>

          {/* Card 3: NO PLATFORM FEES */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3.5 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
              <Percent className="h-5 w-5 rotate-12" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-foreground">No Fees</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                No convenience or platform fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
