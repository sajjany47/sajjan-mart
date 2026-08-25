import Link from 'next/link';
import Image from 'next/image';
import { Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/store/section-header';
import { formatINR } from '@/lib/format';
import type { Puja } from '@/lib/types';

interface Props {
  title: string;
  subtitle: string;
  viewAllHref: string;
  pujas: Puja[];
}

export function PujaSection({ title, subtitle, viewAllHref, pujas }: Props) {
  if (pujas.length === 0) return null;

  return (
    <section className="container-px mx-auto max-w-7xl py-5 sm:py-7">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        link={{ href: viewAllHref, label: 'View All' }}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {pujas.slice(0, 6).map((p) => (
          <Link
            key={p.id}
            href={`/puja/${p.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1"
          >
            {/* Puja Image */}
            <div className="relative aspect-square overflow-hidden bg-muted/60">
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/60 bg-secondary/20">
                  <Sparkles className="h-10 w-10 stroke-1" />
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-extrabold text-primary-foreground shadow-sm backdrop-blur">
                Puja
              </span>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-3 sm:p-3.5">
              <span className="line-clamp-2 text-xs sm:text-sm font-bold text-foreground leading-snug">
                {p.name}
              </span>
              <div className="mt-auto pt-2">
                <span className="text-sm sm:text-base font-extrabold text-foreground">
                  {formatINR(p.base_price)}
                </span>
                <p className="text-[10px] text-muted-foreground">Pandit + Samagri</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
