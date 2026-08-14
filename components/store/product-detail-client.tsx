'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingBag, Heart, Star, Minus, Plus } from 'lucide-react';
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
      {product.product_variants && product.product_variants.length > 0 && (
        <div className="mt-6">
          <Label className="text-sm font-semibold">Select Variant</Label>
          <RadioGroup value={variantId} onValueChange={setVariantId} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {product.product_variants.map((v: ProductVariant) => (
              <div key={v.id} className="flex items-center gap-2 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value={v.id} id={`v-${v.id}`} />
                <Label htmlFor={`v-${v.id}`} className="flex-1 cursor-pointer text-sm">
                  <span className="font-medium">{v.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatINR(discountedPrice(v.price, product.discount_percent))} · {v.stock} in stock
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-border">
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <Button variant="ghost" size="icon" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={() => handleAdd(false)} className="flex-1" disabled={isAddDisabled}>
          <ShoppingBag className="mr-2 h-4 w-4" /> Add to Cart
        </Button>
        <Button onClick={() => handleAdd(true)} variant="secondary" disabled={isAddDisabled}>
          Buy Now
        </Button>
        <Button variant="outline" size="icon" onClick={toggleWishlist} aria-label="Wishlist">
          <Heart className={`h-4 w-4 ${wished ? 'fill-destructive text-destructive' : ''}`} />
        </Button>
      </div>

      {isFood && !isWithinRange && (
        <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-base">🚫</span>
            <div>
              <p className="font-bold text-destructive">Food Delivery Not Available Here</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                {status === 'pending'
                  ? 'Please set your delivery location in the header (📍) to check food delivery availability.'
                  : 'Aapka area hamari 6 km food delivery range se bahar hai, isliye food order nahi kar sakte.'}
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 flex items-center gap-2">
            <span>✅</span>
            <p className="text-emerald-700 dark:text-emerald-400">
              <strong>Natural Products, General &amp; Puja</strong> are available — no delivery range limit.
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

      {/* Reviews tab */}
      <div className="mt-10">
        <Tabs defaultValue="reviews">
          <TabsList>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="write">Write a Review</TabsTrigger>
          </TabsList>
          <TabsContent value="reviews" className="mt-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{r.user?.full_name ?? r.profiles?.full_name ?? 'Anonymous'}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-warning text-warning" />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                    {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
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
    <form onSubmit={submit} className="max-w-md space-y-3">
      <div>
        <Label className="text-sm font-semibold">Rating</Label>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Star className={`h-6 w-6 ${n <= rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="title" className="text-sm font-semibold">Title</Label>
        <input
          id="title"
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="comment" className="text-sm font-semibold">Comment</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  );
}
