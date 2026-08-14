import Link from 'next/link';
import { ProductCard } from '@/components/store/product-card';
import { SectionHeader } from '@/components/store/section-header';
import type { Product } from '@/lib/types';

interface Props {
  title: string;
  subtitle: string;
  viewAllHref: string;
  products: Product[];
}

export function CategoryProductSection({ title, subtitle, viewAllHref, products }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="container-px mx-auto max-w-7xl py-5 sm:py-6">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        link={{ href: viewAllHref, label: 'View All' }}
      />
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar sm:gap-4">
        {products.map((p) => (
          <div key={p.id} className="w-40 shrink-0 sm:w-52 md:w-60 lg:w-64">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
