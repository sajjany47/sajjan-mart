'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/store/product-card';
import { SectionHeader } from '@/components/store/section-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Product } from '@/lib/types';

const SORTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

const PAGE_SIZE = 12;

interface Props {
  filters: { categories: { id: string; name: string; slug: string }[]; brands: { id: string; name: string; slug: string }[] };
  searchParams: { [k: string]: string | string[] | undefined };
  productType?: string;
  productCategories?: { value: string; label: string }[];
  genderOptions?: { value: string; label: string }[];
  showBrands?: boolean;
}

export function ShopClient({ filters, searchParams, productType, productCategories, genderOptions, showBrands }: Props) {
  const params = useSearchParams();
  const initialQ = (params.get('q') as string) || '';
  const initialCategory = (params.get('category') as string) || '';
  const dealsOnly = params.get('deals') === 'true';

  const [q, setQ] = useState(initialQ);
  const [selectedCats, setSelectedCats] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [priceRange, setPriceRange] = useState<number[]>([0, 6000]);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [deals, setDeals] = useState(dealsOnly);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setQ(initialQ);
    setSelectedCats(initialCategory ? [initialCategory] : []);
    setDeals(dealsOnly);
  }, [initialQ, initialCategory, dealsOnly]);

  useEffect(() => {
    let query = supabase
      .from('products')
      .select('*, product_images(*)', { count: 'exact' })
      .eq('is_active', true);

    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    if (selectedCats.length > 0) {
      const catIds = filters.categories.filter((c) => selectedCats.includes(c.slug)).map((c) => c.id);
      query = query.in('category_id', catIds);
    }
    if (selectedBrands.length > 0) {
      const brandIds = filters.brands.filter((b) => selectedBrands.includes(b.slug)).map((b) => b.id);
      query = query.in('brand_id', brandIds);
    }
    if (productType) query = query.eq('product_type', productType);
    if (selectedProductCategory) query = query.eq('product_category', selectedProductCategory);
    if (selectedGender) {
      if (selectedGender === 'all') {
        query = query.in('gender', ['all']);
      } else {
        const genderList =
          selectedGender === 'men' || selectedGender === 'women'
            ? [selectedGender, 'all', 'men_women_both']
            : [selectedGender, 'all'];
        query = query.in('gender', genderList);
      }
    }
    query = query.gte('sales_price', priceRange[0]).lte('sales_price', priceRange[1]);
    if (minRating > 0) query = query.gte('rating', minRating);
    if (deals) query = query.eq('is_today_deal', true);

    switch (sort) {
      case 'price-asc': query = query.order('sales_price', { ascending: true }); break;
      case 'price-desc': query = query.order('sales_price', { ascending: false }); break;
      case 'rating': query = query.order('rating', { ascending: false }); break;
      case 'newest': query = query.order('created_at', { ascending: false }); break;
      default: query = query.order('is_featured', { ascending: false }).order('rating', { ascending: false });
    }

    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    setLoading(true);
    query.then(({ data, count, error }: any) => {
      if (error) {
        setProducts([]);
        setTotal(0);
      } else {
        setProducts((data ?? []) as Product[]);
        setTotal(count ?? 0);
      }
      setLoading(false);
    });
  }, [q, selectedCats, selectedBrands, selectedProductCategory, selectedGender, productType, priceRange, minRating, inStockOnly, deals, sort, page, filters.categories, filters.brands]);

  useEffect(() => setPage(1), [q, selectedCats, selectedBrands, selectedProductCategory, selectedGender, priceRange, minRating, deals, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleBrand(slug: string) {
    setSelectedBrands((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  const FilterPanel = (
    <div className="space-y-6">
      {!productType && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Categories</h3>
          <div className="space-y-2">
            {filters.categories.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Checkbox
                  id={`cat-${c.slug}`}
                  checked={selectedCats.includes(c.slug)}
                  onCheckedChange={(v) =>
                    setSelectedCats((prev) =>
                      v ? [...prev, c.slug] : prev.filter((s) => s !== c.slug)
                    )
                  }
                />
                <Label htmlFor={`cat-${c.slug}`} className="text-sm font-normal cursor-pointer">
                  {c.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {(showBrands || !productType) && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Brands</h3>
          <div className="space-y-2">
            {filters.brands.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <Checkbox
                  id={`brand-${b.slug}`}
                  checked={selectedBrands.includes(b.slug)}
                  onCheckedChange={(v) =>
                    setSelectedBrands((prev) =>
                      v ? [...prev, b.slug] : prev.filter((s) => s !== b.slug)
                    )
                  }
                />
                <Label htmlFor={`brand-${b.slug}`} className="text-sm font-normal cursor-pointer">
                  {b.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {productCategories && productCategories.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Product Category</h3>
          <div className="grid grid-cols-2 gap-2">
            {productCategories.map((c) => (
              <Button
                key={c.value}
                variant={selectedProductCategory === c.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs justify-center"
                onClick={() => setSelectedProductCategory(selectedProductCategory === c.value ? '' : c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {genderOptions && genderOptions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Style / Gender</h3>
          <div className="grid grid-cols-2 gap-2">
            {genderOptions.map((g) => (
              <Button
                key={g.value}
                variant={selectedGender === g.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs justify-center"
                onClick={() => setSelectedGender(selectedGender === g.value ? '' : g.value)}
              >
                {g.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price Range</h3>
        <Slider
          min={0}
          max={6000}
          step={100}
          value={priceRange}
          onValueChange={setPriceRange}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Rs {priceRange[0]}</span>
          <span>Rs {priceRange[1]}</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Minimum Rating</h3>
        <div className="flex gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <Button
              key={r}
              variant={minRating === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMinRating(r)}
            >
              {r === 0 ? 'All' : `${r}+`}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="deals"
          checked={deals}
          onCheckedChange={(v) => setDeals(!!v)}
        />
        <Label htmlFor="deals" className="text-sm font-normal cursor-pointer">
          Today&apos;s Deals only
        </Label>
      </div>
    </div>
  );

  return (
    <div className="container-px mx-auto max-w-7xl py-6">
      <SectionHeader title="Shop" subtitle={`${total} products`} />

      {productCategories && productCategories.length > 0 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant={selectedProductCategory === '' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-xl text-xs whitespace-nowrap font-medium"
            onClick={() => setSelectedProductCategory('')}
          >
            All Categories
          </Button>
          {productCategories.map((c) => (
            <Button
              key={c.value}
              variant={selectedProductCategory === c.value ? 'secondary' : 'ghost'}
              size="sm"
              className={`rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                selectedProductCategory === c.value ? 'bg-primary/15 text-primary font-semibold' : ''
              }`}
              onClick={() => setSelectedProductCategory(selectedProductCategory === c.value ? '' : c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      )}

      {(showBrands || !productType) && filters.brands.length > 0 && (
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant={selectedBrands.length === 0 ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-xl text-xs whitespace-nowrap font-medium"
            onClick={() => setSelectedBrands([])}
          >
            All Brands
          </Button>
          {filters.brands.map((b) => (
            <Button
              key={b.id}
              variant={selectedBrands.includes(b.slug) ? 'secondary' : 'ghost'}
              size="sm"
              className={`rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                selectedBrands.includes(b.slug) ? 'bg-primary/15 text-primary font-semibold' : ''
              }`}
              onClick={() => toggleBrand(b.slug)}
            >
              {b.name}
            </Button>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{FilterPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 rounded-xl border border-border bg-card p-4">
            {FilterPanel}
          </div>
        </aside>

        <div className="relative">
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-card/90 px-6 py-4 shadow-lg">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Loading products...</span>
              </div>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
              <p className="text-muted-foreground">No products found.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setQ('');
                  setSelectedCats([]);
                  setSelectedBrands([]);
                  setSelectedProductCategory('');
                  setSelectedGender('');
                  setPriceRange([0, 6000]);
                  setMinRating(0);
                  setDeals(false);
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
