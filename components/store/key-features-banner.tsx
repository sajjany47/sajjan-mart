'use client';

import { Sparkles, ShieldCheck, CheckCircle2, XCircle, ArrowRight, UserCheck, PackageCheck, CalendarCheck, Receipt, Percent, BadgePercent, Coins } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function KeyFeaturesBanner() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner Headline Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-amber-500/10 via-primary/10 to-orange-500/10 p-3.5 sm:p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm sm:h-10 sm:w-10">
            <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold text-foreground sm:text-base">
              Why Shop at Sajjan Mart? Our 2 Core Promises
            </h2>
            <p className="text-xs text-muted-foreground">
              Zero Hidden Costs &amp; Complete Puja Samagri + Certified Pandit Ji Arrangement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Transparent
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            <UserCheck className="h-3.5 w-3.5" /> Pandit Ji Included
          </span>
        </div>
      </div>

      {/* Main 2 Key Feature Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* KEY FEATURE 1: PUJA SAMAGRI + PANDIT JI INCLUDED */}
        <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-md">
          {/* Subtle background glow */}
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" /> KEY FEATURE #1
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  2-in-1 Combo
                </span>
              </div>

              <h3 className="mt-3 font-display text-lg font-bold text-foreground sm:text-xl lg:text-2xl">
                Puja Samagri Book Karen — Pandit Ji Bhi Sath Me Book Hote Hain!
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Sajjan Mart par Puja Samagri package book karne par aapko alag se Pandit Ji dhoondne ki zarurat nahi! Complete authentic samagri delivered + Verified Vedic Pandit Ji paired for your ritual.
              </p>

              {/* Feature Points Grid */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-background/80 p-2.5 backdrop-blur">
                  <PackageCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Authentic Samagri</p>
                    <p className="text-[10px] text-muted-foreground">100% Curated Items</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-background/80 p-2.5 backdrop-blur">
                  <UserCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Vedic Pandit Ji</p>
                    <p className="text-[10px] text-muted-foreground">Experienced Pujari</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-background/80 p-2.5 backdrop-blur">
                  <CalendarCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">Select Date &amp; Time</p>
                    <p className="text-[10px] text-muted-foreground">As per your Muhurat</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/60">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                14+ Festivals Covered (Durga Puja, Chhath, Diwali &amp; More)
              </span>
              <Link href="/puja">
                <Button size="sm" className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-xs font-bold h-9 px-4">
                  Book Puja &amp; Pandit Ji <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* KEY FEATURE 2: ZERO GST, ZERO PLATFORM FEES, ZERO TAX, ZERO HIDDEN CHARGES */}
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-card p-5 sm:p-6 shadow-sm transition-all duration-300 hover:border-emerald-500/40 hover:shadow-md">
          {/* Subtle background glow */}
          <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> KEY FEATURE #2
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  100% Honest Price
                </span>
              </div>

              <h3 className="mt-3 font-display text-lg font-bold text-foreground sm:text-xl lg:text-2xl">
                NO GST • NO PLATFORM FEES • NO TAX • ZERO HIDDEN CHARGES
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Jo price screen par dikhta hai, bilkul wahi final pay karna hota hai. Hamari website par 0% GST, 0% Tax aur 0% Platform Fee hai — Koi surprises nahi!
              </p>

              {/* Price Transparency Breakdown Box */}
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-background/90 p-3 backdrop-blur space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-border/50 pb-1.5">
                  <span className="text-muted-foreground">Item Price</span>
                  <span className="font-semibold text-foreground">Exact Item Rate</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded-lg bg-emerald-500/10 p-1.5 border border-emerald-500/20">
                    <span className="block font-bold text-emerald-700 dark:text-emerald-400">₹0 GST</span>
                    <span className="text-[10px] text-muted-foreground">No extra GST</span>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-1.5 border border-emerald-500/20">
                    <span className="block font-bold text-emerald-700 dark:text-emerald-400">₹0 Platform Fee</span>
                    <span className="text-[10px] text-muted-foreground">No app fee</span>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 p-1.5 border border-emerald-500/20">
                    <span className="block font-bold text-emerald-700 dark:text-emerald-400">₹0 Tax</span>
                    <span className="text-[10px] text-muted-foreground">No extra taxes</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-border/60">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" /> What You See Is What You Pay
              </span>
              <Link href="/shop">
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-xs font-bold h-9 px-4">
                  Shop Zero Fees <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
