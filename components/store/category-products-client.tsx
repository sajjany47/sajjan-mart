"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/store/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock,
  Loader2,
  Search,
  SlidersHorizontal,
  Utensils,
  X,
  MapPin,
  Compass,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { FoodType, Product } from "@/lib/types";
import { isFoodOpenNow } from "@/lib/store-config-utils";
import { useLocation } from "@/components/providers/location-provider";
import Link from "next/link";

const SORTS = [
  { value: "relevance", label: "Recommended" },
  { value: "rating", label: "Top Rated" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

const PAGE_SIZE = 12;

const NO_BRANDS: { id: string; name: string; slug: string }[] = [];

interface StoreConfigData {
  id: string;
  food_open_time: string;
  food_close_time: string;
  food_is_open: boolean;
}

interface Props {
  title: string;
  description?: string;
  isFood?: boolean;
  productType?: string;
  productCategories?: { value: string; label: string }[];
  genderOptions?: { value: string; label: string }[];
  showBrands?: boolean;
  filters: {
    categories: { id: string; name: string; slug: string }[];
    subCategories?: {
      id: string;
      name: string;
      slug: string;
      categoryId?: string;
    }[];
    brands: { id: string; name: string; slug: string }[];
  };
  searchParams: { [k: string]: string | string[] | undefined };
}

function FoodManualAddressForm({
  checkAddress,
  loading,
}: {
  checkAddress: (addr: string) => Promise<boolean>;
  loading: boolean;
}) {
  const [addr, setAddr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addr.trim()) return;
    setSubmitting(true);
    await checkAddress(addr);
    setSubmitting(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        placeholder="e.g. Kalighat, Kolkata or pincode"
        value={addr}
        onChange={(e) => setAddr(e.target.value)}
        disabled={loading || submitting}
        className="text-xs bg-background"
      />
      <Button
        type="submit"
        size="sm"
        disabled={loading || submitting}
        className="text-xs"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
      </Button>
    </form>
  );
}

export function CategoryProductsClient({
  title,
  description,
  isFood = false,
  productType,
  productCategories,
  genderOptions,
  showBrands,
  filters,
  searchParams,
}: Props) {
  const {
    coords,
    address,
    distance,
    status,
    isWithinRange,
    detectLocation,
    setLocationByAddress,
    loading: locLoading,
  } = useLocation();
  const initialQ = typeof searchParams.q === "string" ? searchParams.q : "";
  const maxPrice = isFood ? 1000 : 6000;

  const [q, setQ] = useState(initialQ);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<FoodType[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState("");
  const [priceRange, setPriceRange] = useState<number[]>([0, maxPrice]);
  const [minRating, setMinRating] = useState(0);
  const [deals, setDeals] = useState(false);
  const [sort, setSort] = useState("relevance");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfigData | null>(null);

  useEffect(() => {
    if (isFood) {
      supabase
        .from("settings")
        .select("*")
        .single()
        .then(({ data }: any) =>
          setStoreConfig(data as StoreConfigData | null),
        );
    }
  }, [isFood]);

  const foodOpen = storeConfig ? isFoodOpenNow(storeConfig) : true;
  const brands = showBrands ? filters.brands : NO_BRANDS;
  const chips = productCategories ?? [];

  const buildParams = useCallback(
    (start: number, end: number) => {
      const queryParams = new URLSearchParams();
      queryParams.set("paginate", "true");
      queryParams.set("start", String(start));
      queryParams.set("end", String(end));
      if (productType) queryParams.set("productType", productType);
      if (q.trim()) queryParams.set("q", q.trim());
      if (selectedCategory)
        queryParams.set("productCategory", selectedCategory);
      if (selectedFoodTypes.length > 0) {
        queryParams.set("foodType", selectedFoodTypes.join(","));
      }
      if (selectedBrands.length > 0) {
        const ids = brands
          .filter((b) => selectedBrands.includes(b.slug))
          .map((b) => b.id);
        if (ids.length > 0) queryParams.set("brandId", ids.join(","));
      }
      if (priceRange[0] > 0) queryParams.set("minPrice", String(priceRange[0]));
      if (priceRange[1] < maxPrice)
        queryParams.set("maxPrice", String(priceRange[1]));
      if (minRating > 0) queryParams.set("minRating", String(minRating));
      if (deals) queryParams.set("todayDeal", "true");
      if (selectedGender) queryParams.set("gender", selectedGender);
      if (sort !== "relevance") queryParams.set("sort", sort);
      return queryParams;
    },
    [
      q,
      selectedCategory,
      selectedFoodTypes,
      selectedBrands,
      brands,
      priceRange,
      maxPrice,
      minRating,
      deals,
      selectedGender,
      sort,
      productType,
    ],
  );

  const hasMore = products.length < total;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<() => void>(() => {});
  const loadingMoreRef = useRef(false);
  const requestedOffsetRef = useRef(-1);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    requestedOffsetRef.current = -1;

    async function fetchFirstPage() {
      try {
        const res = await fetch(
          `/api/products?${buildParams(0, PAGE_SIZE - 1).toString()}`,
        );
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        const list: Product[] = Array.isArray(data)
          ? data
          : (data.products ?? []);
        if (isCancelled) return;
        setProducts(list);
        setTotal(typeof data.total === "number" ? data.total : list.length);
        setLoading(false);
      } catch (err) {
        if (!isCancelled) {
          setProducts([]);
          setTotal(0);
          setLoading(false);
        }
      }
    }

    fetchFirstPage();

    return () => {
      isCancelled = true;
    };
  }, [buildParams]);

  loadMoreRef.current = async () => {
    const offset = products.length;
    if (
      loadingMoreRef.current ||
      !hasMore ||
      requestedOffsetRef.current === offset
    )
      return;
    requestedOffsetRef.current = offset;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/products?${buildParams(offset, offset + PAGE_SIZE - 1).toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      const list: Product[] = Array.isArray(data)
        ? data
        : (data.products ?? []);
      setProducts((prev) => [...prev, ...list]);
    } catch {
      /* noop */
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading]);

  function toggleFoodType(type: FoodType) {
    setSelectedFoodTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function toggleBrand(slug: string) {
    setSelectedBrands((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  function clearAllFilters() {
    setQ("");
    setSelectedCategory("");
    setSelectedFoodTypes([]);
    setSelectedBrands([]);
    setSelectedGender("");
    setPriceRange([0, maxPrice]);
    setMinRating(0);
    setDeals(false);
    setSort("relevance");
  }

  const hasActiveFilters =
    q ||
    selectedCategory ||
    selectedFoodTypes.length > 0 ||
    selectedBrands.length > 0 ||
    selectedGender ||
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice ||
    minRating > 0 ||
    deals;

  const FilterPanel = (
    <div className="space-y-6">
      {isFood && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="flex items-center gap-1.5 border-b border-border pb-3 text-sm font-semibold">
            <Utensils className="h-4 w-4 text-primary" />
            Food Type / Dietary
          </h3>
          <div className="mt-3 space-y-2.5">
            {[
              {
                type: "veg" as FoodType,
                label: "Pure Veg",
                color: "emerald",
                dot: "🟢",
              },
              {
                type: "non_veg" as FoodType,
                label: "Non-Veg",
                color: "rose",
                dot: "🔴",
              },
              {
                type: "egg" as FoodType,
                label: "Contains Egg",
                color: "amber",
                dot: "🟡",
              },
            ].map(({ type, label, color, dot }) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-2.5 transition-all ${
                  selectedFoodTypes.includes(type)
                    ? `border-${color}-500 bg-${color}-500/10 font-medium`
                    : "border-border hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={selectedFoodTypes.includes(type)}
                    onCheckedChange={() => toggleFoodType(type)}
                    className={`data-[state=checked]:bg-${color}-600 data-[state=checked]:border-${color}-600`}
                  />
                  <span className="text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{dot}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Product Category</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={selectedCategory === "" ? "default" : "outline"}
              size="sm"
              className="text-xs justify-center"
              onClick={() => setSelectedCategory("")}
            >
              All
            </Button>
            {chips.map((c) => (
              <Button
                key={c.value}
                variant={selectedCategory === c.value ? "default" : "outline"}
                size="sm"
                className="text-xs justify-center"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === c.value ? "" : c.value,
                  )
                }
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {brands.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Brands</h3>
          <div className="space-y-2">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <Checkbox
                  id={`brand-${b.slug}`}
                  checked={selectedBrands.includes(b.slug)}
                  onCheckedChange={() => toggleBrand(b.slug)}
                />
                <Label
                  htmlFor={`brand-${b.slug}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {b.name}
                </Label>
              </div>
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
                variant={selectedGender === g.value ? "default" : "outline"}
                size="sm"
                className="text-xs justify-center"
                onClick={() =>
                  setSelectedGender(selectedGender === g.value ? "" : g.value)
                }
              >
                {g.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <h3 className="flex items-center justify-between text-sm font-semibold">
          <span>Price Range</span>
          <span className="text-xs text-primary font-semibold">
            ₹{priceRange[0]} - ₹{priceRange[1]}
          </span>
        </h3>
        <Slider
          min={0}
          max={maxPrice}
          step={isFood ? 50 : 100}
          value={priceRange}
          onValueChange={setPriceRange}
          className="py-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹0</span>
          <span>₹{maxPrice / 2}</span>
          <span>₹{maxPrice}+</span>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Minimum Rating</h3>
        <div className="grid grid-cols-2 gap-2">
          {[0, 3, 4, 4.5].map((r) => (
            <Button
              key={r}
              variant={minRating === r ? "default" : "outline"}
              size="sm"
              className="text-xs justify-center"
              onClick={() => setMinRating(r)}
            >
              {r === 0 ? "All" : `${r}★ & above`}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox checked={deals} onCheckedChange={(v) => setDeals(!!v)} />
        <Label className="cursor-pointer text-sm font-normal">
          Today&apos;s Deals only
        </Label>
      </div>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="secondary"
          className="w-full text-xs"
          onClick={clearAllFilters}
        >
          <X className="mr-1.5 h-3.5 w-3.5" /> Clear All Filters
        </Button>
      )}
    </div>
  );

  if (isFood && !isWithinRange) {
    return (
      <div className="space-y-4 pb-12">
        <div>
          <h1 className="font-display text-xl font-semibold sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {description}
            </p>
          )}
        </div>

        <div className="mx-auto max-w-lg mt-8 rounded-2xl border border-border bg-card/60 p-6 shadow-xl backdrop-blur-md text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <MapPin className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight">
              {status === "pending" || status === "checking"
                ? "Check Delivery Availability"
                : "Delivery Range Exceeded"}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {status === "pending" || status === "checking"
                ? "We only deliver fresh food within a 6 km radius of our Kalighat kitchen. Please set your location to check if we deliver to you."
                : "Range se bahar hai isliye order nahi kar sakte. We only deliver fresh food within a 6 km radius of our outlet at 9, Satish Mukherjee Rd, Kalighat."}
            </p>
          </div>

          {status !== "pending" && distance !== null && (
            <div className="rounded-xl bg-destructive/5 border border-destructive/15 p-3 text-xs">
              <span className="font-semibold text-destructive">
                Your Location:{" "}
              </span>
              <span className="text-muted-foreground">
                {distance.toFixed(2)} km away
              </span>
              <span className="block text-[10px] text-muted-foreground/80 mt-0.5 font-medium">
                Maximum range: 6.00 km
              </span>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <Button
              onClick={detectLocation}
              disabled={locLoading}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
            >
              {locLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Compass className="h-4 w-4" />
              )}
              Detect My Location
            </Button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                or enter address
              </span>
              <div className="flex-grow border-t border-border"></div>
            </div>

            <FoodManualAddressForm
              checkAddress={setLocationByAddress}
              loading={locLoading}
            />
          </div>

          <div className="border-t border-border pt-4 text-left">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Browse other categories
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/category/natural-products"
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-background hover:bg-accent text-center transition-all font-sans"
              >
                <span className="text-[10px] font-semibold text-foreground">
                  Natural
                </span>
              </Link>
              <Link
                href="/category/general"
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-background hover:bg-accent text-center transition-all font-sans"
              >
                <span className="text-[10px] font-semibold text-foreground">
                  General
                </span>
              </Link>
              <Link
                href="/puja"
                className="flex flex-col items-center justify-center p-2 rounded-lg border border-border bg-background hover:bg-accent text-center transition-all font-sans"
              >
                <span className="text-[10px] font-semibold text-foreground">
                  Puja Samagri
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      <div>
        <h1 className="font-display text-xl font-semibold sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {isFood && !foodOpen && storeConfig && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <Clock className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs">
            <span className="font-semibold text-destructive">
              The kitchen is currently closed.
            </span>{" "}
            <span className="text-muted-foreground">
              Orders reopen at {storeConfig.food_open_time}. Hours:{" "}
              {storeConfig.food_open_time} - {storeConfig.food_close_time}.
            </span>
          </p>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Button
            variant={selectedCategory === "" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-xl text-xs whitespace-nowrap font-medium"
            onClick={() => setSelectedCategory("")}
          >
            All
          </Button>
          {chips.map((c) => (
            <Button
              key={c.value}
              variant={selectedCategory === c.value ? "secondary" : "ghost"}
              size="sm"
              className={`rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                selectedCategory === c.value
                  ? "bg-primary/15 text-primary font-semibold"
                  : ""
              }`}
              onClick={() =>
                setSelectedCategory(selectedCategory === c.value ? "" : c.value)
              }
            >
              {c.label}
            </Button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              isFood
                ? "Search pizza, burger, biryani, momos..."
                : "Search products..."
            }
            className="bg-card pl-9"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[150px] bg-card text-xs sm:w-[170px]">
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
                <SlidersHorizontal className="h-4 w-4 text-primary" /> Filters
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">{FilterPanel}</div>
          </SheetContent>
        </Sheet>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing{" "}
        <span className="font-semibold text-foreground">{products.length}</span>{" "}
        of <span className="font-semibold text-foreground">{total}</span>{" "}
        {isFood ? "dishes" : "products"}
      </p>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-4">
            {FilterPanel}
          </div>
        </aside>

        <div className="relative">
          {loading && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-card/90 px-6 py-4 shadow-lg">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-medium text-muted-foreground">
                  {isFood ? "Loading food items..." : "Loading products..."}
                </span>
              </div>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-xl border border-border bg-card p-3"
                >
                  <Skeleton className="aspect-square w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Utensils className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold">
                No {isFood ? "food items" : "products"} found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Try a different search or clear your filters to see more.
              </p>
              <Button
                variant="outline"
                className="mt-4 text-xs"
                onClick={clearAllFilters}
              >
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

              {hasMore && (
                <div ref={sentinelRef} className="h-px w-full" aria-hidden />
              )}

              {loadingMore && (
                <div className="mt-8 flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Loading more...
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
