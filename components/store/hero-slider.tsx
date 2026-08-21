'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Sparkles, ShieldCheck, UserCheck, CheckCircle2 } from 'lucide-react';
import type { Banner } from '@/lib/types';

type Slide = Banner & {
  variant?: 'charges' | 'puja_pandit' | 'standard';
  badges?: string[];
};

export type { Slide };

export function HeroSlider({ banners }: { banners: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5500);
    return () => clearInterval(t);
  }, [paused, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-950 sm:aspect-[2/1] lg:aspect-[21/9] shadow-xl border border-border/50 group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
        >
          {/* Background Image - Bright, Vibrant & Visible */}
          {b.image_url ? (
            <Image
              src={b.image_url}
              alt={b.title}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-center brightness-105 contrast-[1.05] transition-transform duration-700 group-hover:scale-102"
            />
          ) : null}

          {/* Soft Left Gradient Overlay for Text Readability without blocking the image */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent sm:w-4/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent sm:hidden" />

          {/* Content Container - Glassmorphic Box for High Contrast */}
          <div className="relative z-10 flex h-full flex-col justify-center px-4 sm:px-10 lg:px-16 max-w-2xl">
            <div className="rounded-2xl bg-slate-950/65 p-4 sm:p-6 backdrop-blur-md border border-white/15 shadow-2xl space-y-2 sm:space-y-3">
              {/* Badges Bar */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {b.variant === 'charges' ? (
                  (b.badges || ['₹0 GST', '₹0 PLATFORM FEES', '₹0 TAX']).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-300 shadow-sm"
                    >
                      <ShieldCheck className="h-3 w-3 text-emerald-400" /> {t}
                    </span>
                  ))
                ) : b.variant === 'puja_pandit' ? (
                  (b.badges || ['🛕 PANDIT JI INCLUDED', '📦 COMPLETE PUJA SAMAGRI']).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-950/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-amber-300 shadow-sm"
                    >
                      <UserCheck className="h-3 w-3 text-amber-300" /> {t}
                    </span>
                  ))
                ) : (
                  (b.badges || []).map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-slate-950/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-sm"
                    >
                      <Sparkles className="h-3 w-3 text-amber-300" /> {badge}
                    </span>
                  ))
                )}
              </div>

              {/* Title */}
              <h2 className="font-display text-lg font-extrabold text-white sm:text-2xl lg:text-4xl leading-tight drop-shadow-md">
                {b.title}
              </h2>

              {/* Subtitle */}
              {b.subtitle && (
                <p className="text-xs sm:text-base font-medium text-slate-100 leading-snug drop-shadow line-clamp-2">
                  {b.subtitle}
                </p>
              )}

              {/* CTA Button */}
              {b.cta_link && b.cta_text && (
                <div className="pt-1 flex items-center gap-3">
                  <Link href={b.cta_link}>
                    <Button
                      size="sm"
                      className={`h-9 px-5 text-xs sm:h-10 sm:px-7 sm:text-sm font-bold shadow-lg transition-transform active:scale-95 ${
                        b.variant === 'charges'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                          : b.variant === 'puja_pandit'
                          ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {b.cta_text}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Slider Prev / Next Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-slate-950/60 p-2 text-white backdrop-blur border border-white/20 hover:bg-slate-950 sm:left-3 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-slate-950/60 p-2 text-white backdrop-blur border border-white/20 hover:bg-slate-950 sm:right-3 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all sm:h-2 ${
                  i === index ? 'w-6 bg-white sm:w-8' : 'w-1.5 bg-white/50 sm:w-2'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
