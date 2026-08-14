'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@/lib/types';

type Slide = Banner & { variant?: 'charges' };

export type { Slide };

export function HeroSlider({ banners }: { banners: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [paused, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted sm:aspect-[2/1] lg:aspect-[21/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {b.variant === 'charges' ? (
            <div className="flex h-full w-full items-center justify-center bg-primary px-6 text-center">
              <div className="relative z-10 max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {['NO GST', 'NO TAX', 'NO PLATFORM FEES'].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-4 py-1.5 text-xs font-bold tracking-wide text-primary-foreground sm:text-sm"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="font-display text-2xl font-bold text-white sm:text-4xl lg:text-5xl">
                  NO HIDDEN CHARGES
                </h2>
                <p className="mx-auto max-w-md text-sm text-primary-foreground/85 sm:text-base">
                  What you see is what you pay. Shop with complete price transparency.
                </p>
                {b.cta_link && b.cta_text && (
                  <Link href={b.cta_link} className="inline-block">
                    <Button variant="secondary" size="lg">
                      {b.cta_text}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <>
              <Image
                src={b.image_url ?? ''}
                alt={b.title}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
              <div className="relative flex h-full flex-col justify-center px-6 sm:px-12 lg:px-20">
                <h2 className="max-w-xl font-display text-2xl font-semibold text-white sm:text-4xl lg:text-5xl">
                  {b.title}
                </h2>
                {b.subtitle && (
                  <p className="mt-3 max-w-md text-sm text-white/80 sm:text-lg">{b.subtitle}</p>
                )}
                {b.cta_link && b.cta_text && (
                  <Link href={b.cta_link} className="mt-6">
                    <Button size="lg">{b.cta_text}</Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white backdrop-blur hover:bg-white/30"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-white' : 'w-2 bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
