'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ProductCard } from '@/components/store/product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
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
import {
  Search,
  SlidersHorizontal,
  Utensils,
  Sparkles,
  Clock,
  Star,
  Pizza,
  Flame,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Product, FoodType } from '@/lib/types';

const SORTS = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest Arrivals' },
];

const PAGE_SIZE = 12;

interface Props {
  filters: {
    categories: { id: string; name: string; slug: string }[];
    subCategories?: { id: string; name: string; slug: string; categoryId?: string }[];
    brands: { id: string; name: string; slug: string }[];
  };
  searchParams: { [k: string]: string | string[] | undefined };
}

export function FoodShopClient({ filters }: Props) {
  const params = useSearchParams();
  const initialQ = params.get('q') || '';
  const initialSubCat = params.get('subCategory') || '';

  const [q, setQ] = useState(initialQ);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<FoodType[]>([]);
  const [selectedSubCat, setSelectedSubCat] = useState<string>(initialSubCat);
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Sync initial params
  useEffect(() => {
    setQ(initialQ);
    setSelectedSubCat(initialSubCat);
  }, [initialQ, initialSubCat]);

  // Food Subcategories list
  const foodSubCategories = useMemo(() => {
    return filters.subCategories || [
      { id: '1', name: 'Pizza', slug: 'pizza' },
      { id: '2', name: 'Burger', slug: 'burger' },
      { id: '3', name: 'Momos', slug: 'momos' },
      { id: '4', name: 'Biryani', slug: 'biryani' },
      { id: '5', name: 'Rolls', slug: 'rolls' },
      { id: '6', name: 'Beverages', slug: 'beverages' },
    ];
  }, [filters.subCategories]);

  // Main data fetching
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    async function fetchFoodProducts() {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('productType', 'food');

        if (q.trim()) queryParams.set('q', q.trim());
        if (selectedSubCat) queryParams.set('subCategorySlug', selectedSubCat);
        if (selectedFoodTypes.length > 0) {
          queryParams.set('foodType', selectedFoodTypes.join(','));
        }
        if (priceRange[0] > 0) queryParams.set('minPrice', String(priceRange[0]));
        if (priceRange[1] < 1000) queryParams.set('maxPrice', String(priceRange[1]));
        if (minRating > 0) queryParams.set('minRating', String(minRating));
        if (sort !== 'relevance') queryParams.set('sort', sort);

        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch food items');
        const data: Product[] = await res.json();

        if (!isCancelled) {
          let list = Array.isArray(data) ? data : [];
          
          // Additional safety check for client side foodType filtering
          if (selectedFoodTypes.length > 0) {
            list = list.filter((p) => {
              const ft = p.food_type || (p.metadata?.veg ? 'veg' : 'non_veg');
              return selectedFoodTypes.includes(ft as FoodType);
            });
          }

          setTotal(list.length);
          const startIndex = (page - 1) * PAGE_SIZE;
          setProducts(list.slice(startIndex, startIndex + PAGE_SIZE));
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setProducts([]);
          setTotal(0);
          setLoading(false);
        }
      }
    }

    fetchFoodProducts();

    return () => {
      isCancelled = true;
    };
  }, [q, selectedSubCat, selectedFoodTypes, priceRange, minRating, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [q, selectedSubCat, selectedFoodTypes, priceRange, minRating, sort]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggleFoodType(type: FoodType) {
    setSelectedFoodTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function clearAllFilters() {
    setQ('');
    setSelectedFoodTypes([]);
    setSelectedSubCat('');
    setPriceRange([0, 1000]);
    setMinRating(0);
    setSort('relevance');
    setPage(1);
  }

  const hasActiveFilters =
    q || selectedFoodTypes.length > 0 || selectedSubCat || priceRange[0] > 0 || priceRange[1] < 1000 || minRating > 0;

  // Render Filter Panel Component
  const FilterPanel = (
    <div className="space-y-6">
      {/* Food Type Filter (Veg, Non Veg, Egg) */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Utensils className="h-4 w-4 text-primary" />
            Food Type / Dietary
          </h3>
          {selectedFoodTypes.length > 0 && (
            <button
              onClick={() => setSelectedFoodTypes([])}
              className="text-xs text-primary hover:underline font-medium"
            >
              Reset
            </button>
          )}
        </div>
        <div className="mt-3 space-y-2.5">
          {/* Veg option */}
          <label
            htmlFor="food-type-veg"
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
              selectedFoodTypes.includes('veg')
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-medium'
                : 'border-border hover:bg-accent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="food-type-veg"
                checked={selectedFoodTypes.includes('veg')}
                onCheckedChange={() => toggleFoodType('veg')}
                className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
              />
              <div className="flex items-center gap-1.5 text-sm">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-emerald-600 p-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                <span>Pure Veg</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-normal">🟢</span>
          </label>

          {/* Non Veg option */}
          <label
            htmlFor="food-type-non-veg"
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
              selectedFoodTypes.includes('non_veg')
                ? 'border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-200 font-medium'
                : 'border-border hover:bg-accent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="food-type-non-veg"
                checked={selectedFoodTypes.includes('non_veg')}
                onCheckedChange={() => toggleFoodType('non_veg')}
                className="data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
              />
              <div className="flex items-center gap-1.5 text-sm">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-rose-600 p-0.5">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                </span>
                <span>Non-Veg</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-normal">🔴</span>
          </label>

          {/* Egg option */}
          <label
            htmlFor="food-type-egg"
            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
              selectedFoodTypes.includes('egg')
                ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 font-medium'
                : 'border-border hover:bg-accent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="food-type-egg"
                checked={selectedFoodTypes.includes('egg')}
                onCheckedChange={() => toggleFoodType('egg')}
                className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
              />
              <div className="flex items-center gap-1.5 text-sm">
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-amber-600 p-0.5">
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                </span>
                <span>Contains Egg</span>
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-normal">🟡</span>
          </label>
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Price Range</span>
          <span className="text-xs text-primary font-semibold">
            ₹{priceRange[0]} - ₹{priceRange[1]}
          </span>
        </h3>
        <Slider
          min={0}
          max={1000}
          step={50}
          value={priceRange}
          onValueChange={setPriceRange}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹0</span>
          <span>₹500</span>
          <span>₹1,000+</span>
        </div>

        {/* Quick price presets */}
        <div className="pt-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => setPriceRange([0, 150])}
          >
            Under ₹150
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => setPriceRange([150, 300])}
          >
            ₹150 - ₹300
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2.5"
            onClick={() => setPriceRange([300, 1000])}
          >
            Above ₹300
          </Button>
        </div>
      </div>

      {/* Minimum Rating Filter */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-warning text-warning" />
          Rating Filter
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'All Ratings', value: 0 },
            { label: '3.5★ & above', value: 3.5 },
            { label: '4.0★ & above', value: 4.0 },
            { label: '4.5★ & above', value: 4.5 },
          ].map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={minRating === item.value ? 'default' : 'outline'}
              size="sm"
              className="text-xs justify-center"
              onClick={() => setMinRating(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear All Action */}
      {hasActiveFilters && (
        <Button
          type="button"
          variant="secondary"
          className="w-full text-xs"
          onClick={clearAllFilters}
        >
          <X className="mr-1.5 h-3.5 w-3.5" /> Clear All Food Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Dedicated Food Section Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 p-6 md:p-10 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Flame className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
            <span>Sajjan Cloud Kitchen</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            Delicious Food, Delivered Hot & Fresh
          </h1>
          <p className="mt-2 text-sm md:text-base text-orange-100 font-medium">
            Explore authentic freshly prepared meals, pizzas, biryanis, momos, and beverages. Customized for your appetite!
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-orange-50">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-yellow-300" /> Fast 20-30 Mins Delivery
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-yellow-300" /> 100% Quality Guarantee
            </span>
            <span className="flex items-center gap-1.5">
              <Utensils className="h-4 w-4 text-yellow-300" /> Fresh Ingredients Daily
            </span>
          </div>
        </div>
      </div>

      {/* Quick Dietary Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">
            Dietary Filter:
          </span>
          <Button
            variant={selectedFoodTypes.length === 0 ? 'default' : 'outline'}
            size="sm"
            className="rounded-full text-xs h-8 px-3.5"
            onClick={() => setSelectedFoodTypes([])}
          >
            All Food
          </Button>
          <Button
            variant={selectedFoodTypes.includes('veg') ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full text-xs h-8 px-3.5 transition-all ${
              selectedFoodTypes.includes('veg')
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
            onClick={() => toggleFoodType('veg')}
          >
            <span className="mr-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-sm border border-current p-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            Veg Only
          </Button>
          <Button
            variant={selectedFoodTypes.includes('non_veg') ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full text-xs h-8 px-3.5 transition-all ${
              selectedFoodTypes.includes('non_veg')
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'border-rose-600/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
            onClick={() => toggleFoodType('non_veg')}
          >
            <span className="mr-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-sm border border-current p-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            Non-Veg
          </Button>
          <Button
            variant={selectedFoodTypes.includes('egg') ? 'default' : 'outline'}
            size="sm"
            className={`rounded-full text-xs h-8 px-3.5 transition-all ${
              selectedFoodTypes.includes('egg')
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'border-amber-600/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
            onClick={() => toggleFoodType('egg')}
          >
            <span className="mr-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-sm border border-current p-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
            </span>
            Egg
          </Button>
        </div>

        {/* Total Count Display */}
        <div className="text-xs text-muted-foreground font-medium">
          Showing <span className="text-foreground font-semibold">{total}</span> dishes
        </div>
      </div>

      {/* Subcategories Horizontal Scroll Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button
          variant={selectedSubCat === '' ? 'secondary' : 'ghost'}
          size="sm"
          className="rounded-xl text-xs whitespace-nowrap font-medium"
          onClick={() => setSelectedSubCat('')}
        >
          All Categories
        </Button>
        {foodSubCategories.map((sc) => (
          <Button
            key={sc.id}
            variant={selectedSubCat === sc.slug ? 'secondary' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
              selectedSubCat === sc.slug ? 'bg-primary/15 text-primary font-semibold' : ''
            }`}
            onClick={() => setSelectedSubCat(selectedSubCat === sc.slug ? '' : sc.slug)}
          >
            {sc.name}
          </Button>
        ))}
      </div>

      {/* Controls Bar: Search, Sort, Mobile Filter Trigger */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pizza, burger, biryani, momos..."
            className="pl-9 bg-card"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[170px] bg-card text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mobile Filter Drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="lg:hidden relative">
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" /> Food Filters
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">{FilterPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Grid & Desktop Sidebar */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block space-y-4">
          <div className="sticky top-24">{FilterPanel}</div>
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-3">
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                <Utensils className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">No food items matched your filters</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Try selecting different dietary preferences, expanding your price range, or clearing filters.
              </p>
              <Button variant="outline" className="mt-5 text-xs" onClick={clearAllFilters}>
                Clear all filters
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
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
