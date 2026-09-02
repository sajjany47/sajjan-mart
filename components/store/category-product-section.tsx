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
    <section className="container-px mx-auto max-w-7xl py-5 sm:py-7">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        link={{ href: viewAllHref, label: 'View All' }}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {products.slice(0, 6).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
