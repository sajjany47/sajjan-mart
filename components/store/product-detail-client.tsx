'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingBag, Heart, Star, Minus, Plus, Zap, MessageSquare } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useLocation } from '@/components/providers/location-provider';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatINR, discountedPrice } from '@/lib/format';
import type { Product, ProductVariant } from '@/lib/types';
import { AddonDialog, AddOnOption } from '@/components/store/addon-dialog';

interface Props {
  product: Product;
  reviews: any[];
}

export function ProductDetailClient({ product, reviews }: Props) {
  const { addItem } = useCart();
  const { user } = useAuth();
  const { isWithinRange, status } = useLocation();
  const router = useRouter();
  const isFood = product.product_type === 'food';
  const isAddDisabled = isFood && !isWithinRange;
  const [variantId, setVariantId] = useState<string>(product.product_variants?.[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [addonOpen, setAddonOpen] = useState(false);
  const [pendingBuyNow, setPendingBuyNow] = useState(false);

  const variant = product.product_variants?.find((v) => v.id === variantId);
  const salePrice = variant?.price ?? product.sales_price;
  const price = discountedPrice(salePrice, product.discount_percent);

  const addOnOptions: AddOnOption[] = (product.add_on_links ?? []).flatMap((link) => {
    const a = link.add_on;
    return a ? [{ id: a.id, name: a.name, price: Number(a.price) }] : [];
  });

  async function toggleWishlist() {
    if (!user) {
      toast.error('Please sign in to save items to your wishlist.');
      return;
    }
    if (wished) {
      await supabase.from('wishlist').delete().eq('user_id', user.id).eq('product_id', product.id);
      setWished(false);
      toast.success('Removed from wishlist');
    } else {
      await supabase.from('wishlist').insert({ user_id: user.id, product_id: product.id });
      setWished(true);
      toast.success('Added to wishlist');
    }
  }

  function commitAdd(buyNow: boolean, addOns: AddOnOption[], unitPrice: number) {
    addItem({
      type: 'product',
      productType: product.product_type,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.product_images?.[0]?.url,
      price: unitPrice,
      quantity: qty,
      variantName: variant?.name,
      addOns,
    });
    if (buyNow) {
      router.push('/checkout');
    } else {
      toast.success(`${product.name} added to cart`);
    }
  }

  function handleAdd(buyNow = false) {
    if (addOnOptions.length > 0) {
      setPendingBuyNow(buyNow);
      setAddonOpen(true);
      return;
    }
    commitAdd(buyNow, [], price);
  }

  return (
    <>
      {/* Variant Selector */}
      {product.product_variants && product.product_variants.length > 0 && (
        <div className="mt-5">
          <Label className="text-sm font-bold">Select Variant</Label>
          <RadioGroup value={variantId} onValueChange={setVariantId} className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.product_variants.map((v: ProductVariant) => (
              <label
                key={v.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 p-3 transition-all ${
                  variantId === v.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/30 hover:bg-accent/50'
                }`}
              >
                <RadioGroupItem value={v.id} id={`v-${v.id}`} className="sr-only" />
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${variantId === v.id ? 'border-primary' : 'border-muted-foreground/30'}`}>
                  {variantId === v.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold truncate">{v.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {formatINR(discountedPrice(v.price, product.discount_percent))} · {v.stock} in stock
                  </span>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Quantity + Add to Cart */}
      <div className="mt-5">
        <Label className="text-sm font-bold">Quantity</Label>
        <div className="mt-2.5 flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-border bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-l-xl"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center text-sm font-extrabold">{qty}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-r-xl"
              onClick={() => setQty((q) => q + 1)}
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            Total: <strong className="text-foreground">{formatINR(price * qty)}</strong>
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
        <Button
          onClick={() => handleAdd(false)}
          className="h-11 flex-1 gap-2 rounded-xl text-sm font-bold shadow-sm"
          disabled={isAddDisabled}
        >
          <ShoppingBag className="h-4 w-4" /> Add to Cart
        </Button>
        <Button
          onClick={() => handleAdd(true)}
          variant="secondary"
          className="h-11 gap-2 rounded-xl text-sm font-bold"
          disabled={isAddDisabled}
        >
          <Zap className="h-4 w-4" /> Buy Now
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={toggleWishlist}
          aria-label="Wishlist"
        >
          <Heart className={`h-4.5 w-4.5 transition-all ${wished ? 'fill-rose-500 text-rose-500 scale-110' : ''}`} />
        </Button>
      </div>

      {/* Food out-of-range warning */}
      {isFood && !isWithinRange && (
        <div className="mt-4 overflow-hidden rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-pink-50/50 p-4 dark:border-rose-900/30 dark:from-rose-950/20 dark:to-pink-950/10">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🚫</span>
            <div>
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Food Delivery Not Available Here</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {status === 'pending'
                  ? 'Set your delivery location in the header (📍) to check food delivery availability.'
                  : 'Aapka area hamari 6 km food delivery range se bahar hai.'}
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-emerald-200/60 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
              ✅ <strong>Natural, General & Puja</strong> — available everywhere, no range limit.
            </p>
          </div>
        </div>
      )}

      <AddonDialog
        productName={product.name}
        basePrice={price}
        quantity={qty}
        addOns={addOnOptions}
        open={addonOpen}
        onOpenChange={setAddonOpen}
        onConfirm={(addOns, unitPrice) => {
          setAddonOpen(false);
          commitAdd(pendingBuyNow, addOns, unitPrice);
        }}
      />

      {/* Reviews Section */}
      <div className="mt-8">
        <Tabs defaultValue="reviews">
          <TabsList className="h-auto gap-0 p-0.5">
            <TabsTrigger value="reviews" className="gap-1.5 rounded-lg text-xs font-semibold">
              <MessageSquare className="h-3.5 w-3.5" /> Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="write" className="gap-1.5 rounded-lg text-xs font-semibold">
              <Star className="h-3.5 w-3.5" /> Write Review
            </TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Star className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-semibold">No reviews yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Be the first to review this product!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/60 bg-card p-4 transition hover:shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(r.user?.full_name ?? r.profiles?.full_name ?? 'A')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{r.user?.full_name ?? r.profiles?.full_name ?? 'Anonymous'}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.title && <p className="mt-2.5 text-sm font-semibold">{r.title}</p>}
                    {r.comment && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="write" className="mt-4">
            <ReviewForm productId={product.id} userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function ReviewForm({ productId, userId }: { productId: string; userId?: string }) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      toast.error('Please sign in to write a review.');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('reviews')
      .insert({ product_id: productId, user_id: userId, rating, title, comment });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Review submitted!');
      setTitle('');
      setComment('');
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4">
      <div>
        <Label className="text-sm font-bold">Your Rating</Label>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`} className="transition hover:scale-110">
              <Star className={`h-7 w-7 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="title" className="text-sm font-bold">Title</Label>
        <input
          id="title"
          className="mt-1.5 flex h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-ring"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
        />
      </div>
      <div>
        <Label htmlFor="comment" className="text-sm font-bold">Your Review</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="mt-1.5 rounded-xl"
          placeholder="Tell others what you liked or didn't like..."
        />
      </div>
      <Button type="submit" disabled={loading} className="rounded-xl font-semibold" size="lg">
        {loading ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}
