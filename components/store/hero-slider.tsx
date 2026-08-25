'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
      className="group relative aspect-[43/24] w-full overflow-hidden rounded-xl border border-border/70 bg-slate-950 shadow-sm sm:rounded-2xl"
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
          {b.image_url ? (
            <Image
              src={b.image_url}
              alt={b.title}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover object-center"
            />
          ) : null}

          {b.cta_link && b.cta_text && (
            <div className="absolute bottom-3 left-3 z-10 hidden sm:block">
              <Link href={b.cta_link}>
                <Button size="sm" className="h-9 rounded-lg px-5 text-xs font-bold shadow-lg">
                  {b.cta_text}
                </Button>
              </Link>
            </div>
          )}
        </div>
      ))}

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-sm backdrop-blur transition-all hover:bg-slate-950/70 sm:left-3 sm:h-9 sm:w-9"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <button
            onClick={() => setIndex((i) => (i + 1) % banners.length)}
            className="absolute right-2 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white shadow-sm backdrop-blur transition-all hover:bg-slate-950/70 sm:right-3 sm:h-9 sm:w-9"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 sm:bottom-4">
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
