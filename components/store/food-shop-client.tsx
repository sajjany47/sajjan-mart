'use client';

import { useEffect, useState } from 'react';
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
  Flame,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { Product, FoodType } from '@/lib/types';
import { isFoodOpenNow } from '@/lib/store-config-utils';

interface StoreConfigData {
  id: string;
  food_open_time: string;
  food_close_time: string;
  food_is_open: boolean;
}

const SORTS = [
  { value: 'relevance', label: 'Recommended' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest Arrivals' },
];

const FOOD_CATEGORIES = [
  { value: 'pizza', label: 'Pizza' },
  { value: 'burger', label: 'Burger' },
  { value: 'biryani', label: 'Biryani' },
  { value: 'rolls_wraps', label: 'Rolls & Wraps' },
  { value: 'momos', label: 'Momos' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'fast_food', label: 'Fast Food' },
  { value: 'snacks', label: 'Snacks & Starters' },
  { value: 'desserts', label: 'Desserts & Ice Cream' },
  { value: 'beverages', label: 'Beverages & Shakes' },
];

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

  const [q, setQ] = useState(initialQ);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<FoodType[]>([]);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<number[]>([0, 1000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sort, setSort] = useState('relevance');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [storeConfig, setStoreConfig] = useState<StoreConfigData | null>(null);

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }: any) => setStoreConfig(data as StoreConfigData | null));
  }, []);

  const foodOpen = storeConfig ? isFoodOpenNow(storeConfig) : true;

  // Sync initial params
  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  // Main data fetching
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    async function fetchFoodProducts() {
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('productType', 'food');

        if (q.trim()) queryParams.set('q', q.trim());
        if (selectedFoodCategory) queryParams.set('productCategory', selectedFoodCategory);
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
          setProducts(list);
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
  }, [q, selectedFoodCategory, selectedFoodTypes, priceRange, minRating, sort]);

  function toggleFoodType(type: FoodType) {
    setSelectedFoodTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  function clearAllFilters() {
    setQ('');
    setSelectedFoodTypes([]);
    setSelectedFoodCategory('');
    setPriceRange([0, 1000]);
    setMinRating(0);
    setSort('relevance');
  }

  const hasActiveFilters =
    q || selectedFoodTypes.length > 0 || selectedFoodCategory || priceRange[0] > 0 || priceRange[1] < 1000 || minRating > 0;

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
      <div className="relative overflow-hidden rounded-3xl bg-stone-950 p-8 md:p-12 text-white shadow-2xl border border-stone-800/60">
        {/* Background Image with Ambient Blending */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity hover:opacity-40 transition-opacity duration-700 pointer-events-none" 
          style={{ backgroundImage: `url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/70 to-transparent z-0 pointer-events-none" />
        
        {/* Decorative Ambient Radial Glows */}
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400 backdrop-blur-sm">
            <Flame className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
            <span>Sajjan Cloud Kitchen</span>
            <span className="mx-1 h-1 w-1 rounded-full bg-orange-500/50" />
            <span className={`inline-flex items-center gap-1.5 ${foodOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
              {foodOpen ? (
                <><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open now</>
              ) : (
                <><span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Closed</>
              )}
            </span>
          </div>
          
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-white via-stone-100 to-orange-200 bg-clip-text text-transparent leading-tight">
            Delicious Food, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Delivered Hot & Fresh</span>
          </h1>
          
          <p className="text-sm md:text-base text-stone-300 leading-relaxed max-w-xl">
            Explore authentic freshly prepared meals, pizzas, biryanis, momos, and beverages. Handcrafted by our expert chefs and customized for your appetite!
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-stone-400 border-t border-stone-800/40">
            <span className="flex items-center gap-2 hover:text-white transition-colors duration-200">
              <Clock className="h-4 w-4 text-orange-400" /> Fast 20-30 Mins Delivery
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors duration-200">
              <Sparkles className="h-4 w-4 text-orange-400" /> 100% Quality Guarantee
            </span>
            <span className="flex items-center gap-2 hover:text-white transition-colors duration-200">
              <Utensils className="h-4 w-4 text-orange-400" /> Fresh Ingredients Daily
            </span>
          </div>
        </div>
      </div>

      {/* Quick Dietary Selector Bar */}
      {!foodOpen && storeConfig && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <Clock className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">The kitchen is currently closed.</p>
            <p className="text-xs text-muted-foreground">
              Orders will be accepted again from {storeConfig.food_open_time}. Opening hours: {storeConfig.food_open_time} - {storeConfig.food_close_time}.
            </p>
          </div>
        </div>
      )}

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

      {/* Food Categories Horizontal Scroll Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button
          variant={selectedFoodCategory === '' ? 'secondary' : 'ghost'}
          size="sm"
          className="rounded-xl text-xs whitespace-nowrap font-medium"
          onClick={() => setSelectedFoodCategory('')}
        >
          All Food
        </Button>
        {FOOD_CATEGORIES.map((c) => (
          <Button
            key={c.value}
            variant={selectedFoodCategory === c.value ? 'secondary' : 'ghost'}
            size="sm"
            className={`rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
              selectedFoodCategory === c.value ? 'bg-primary/15 text-primary font-semibold' : ''
            }`}
            onClick={() => setSelectedFoodCategory(selectedFoodCategory === c.value ? '' : c.value)}
          >
            {c.label}
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
