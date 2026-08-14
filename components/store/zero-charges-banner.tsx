'use client';

import { Percent, Receipt, BadgePercent, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ZeroChargesBanner() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 p-4 md:mb-8 md:p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
      {/* Decorative background glow */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:flex-1 max-w-2xl">
          {/* Card 1: NO GST */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm sm:p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300 sm:h-10 sm:w-10">
              <BadgePercent className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Zero GST</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No GST added at checkout.
              </p>
            </div>
          </div>

          {/* Card 2: NO TAX */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm sm:p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300 sm:h-10 sm:w-10">
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">Zero Tax</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Prices inclusive of all taxes.
              </p>
            </div>
          </div>

          {/* Card 3: NO PLATFORM FEES */}
          <div className="group flex items-start gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-all duration-300 hover:bg-card hover:translate-y-[-2px] hover:shadow-sm sm:p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 sm:h-10 sm:w-10">
              <Percent className="h-4 w-4 rotate-12 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">No Fees</span>
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No convenience or platform fees.
              </p>
            </div>
          </div>
        </div>

        <Link href="/shop" className="shrink-0 self-center">
          <Button size="sm" className="h-9 px-4 text-xs sm:h-10 sm:px-6 sm:text-sm">
            Start Shopping <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
