"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { formatINR, generateOrderNumber } from "@/lib/format";
import { toast } from "sonner";
import type { Address } from "@/lib/types";
import { isFoodOpenNow, isPaymentModeAllowed, PAYMENT_METHODS, computeTotals, getTaxRate } from "@/lib/store-config-utils";
import { groupItemsBySection } from "@/lib/cart-sections";

interface StoreConfigData {
  id: string;
  food_open_time: string;
  food_close_time: string;
  food_is_open: boolean;
  payment_mode: "offline" | "online" | "both";
  tax_rate: number;
  shipping_charge: number;
  free_shipping_threshold: number;
}

export function CheckoutClient() {
  const { items, subtotal, clearCart, appliedCoupon, couponDiscount, removeCoupon } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "razorpay" | "cashfree"
  >("cod");
  const [config, setConfig] = useState<StoreConfigData | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    district: "",
    state: "",
    region: "",
    block: "",
    country: "India",
    pincode: "",
  });

  const { shipping, tax, total } = computeTotals(subtotal, couponDiscount, config ?? {});
  const taxRate = getTaxRate(config ?? {});

  const hasFood = items.some((i) => i.productType === "food");
  const foodClosed = hasFood && config ? !isFoodOpenNow(config) : false;

  const enabledPayments = config
    ? (PAYMENT_METHODS[config.payment_mode] ?? PAYMENT_METHODS.both)
    : PAYMENT_METHODS.both;

  useEffect(() => {
    if (!user) {
      router.push("/login?redirect=/checkout");
      return;
    }
    if (items.length === 0) {
      router.push("/cart");
      return;
    }
    supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }: any) => {
        setAddresses((data ?? []) as Address[]);
        if (data && data.length > 0) setSelectedAddressId(data[0].id);
      });
    supabase
      .from("settings")
      .select("*")
      .single()
      .then(({ data }: any) => {
        if (data) {
          setConfig(data as StoreConfigData);
          const list = PAYMENT_METHODS[data.payment_mode] ?? PAYMENT_METHODS.both;
          setPaymentMethod((prev) =>
            isPaymentModeAllowed(data.payment_mode, prev) ? prev : (list[0].value as any)
          );
        }
      });
  }, [user, items.length, router]);

  async function saveAddress() {
    if (!user) return;
    if (
      !newAddr.full_name ||
      !newAddr.phone ||
      !newAddr.line1 ||
      !newAddr.city ||
      !newAddr.district ||
      !newAddr.state ||
      !newAddr.pincode
    ) {
      toast.error("Please fill all address fields.");
      return;
    }
    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...newAddr, user_id: user.id })
      .select("*")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAddresses((prev) => [...prev, data as Address]);
    setSelectedAddressId(data.id);
    setNewAddr({
      full_name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      district: "",
      state: "",
      region: "",
      block: "",
      country: "India",
      pincode: "",
    });
    toast.success("Address saved");
  }

  async function placeOrder() {
    if (!user) return;
    if (!selectedAddressId && addresses.length === 0) {
      toast.error("Please add a delivery address.");
      return;
    }
    const address =
      addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];
    if (!address) {
      toast.error("Please select a delivery address.");
      return;
    }
    if (foodClosed) {
      toast.error(
        `The Food section is currently closed (${config?.food_open_time} - ${config?.food_close_time}). Please try again later.`
      );
      return;
    }
    if (!enabledPayments.some((p) => p.value === paymentMethod)) {
      toast.error("This payment method is not available.");
      return;
    }
    setLoading(true);
    const orderNumber = generateOrderNumber();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: "pending",
        subtotal,
        discount: couponDiscount,
        shipping,
        tax,
        total,
        coupon_code: appliedCoupon || null,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cod" ? "pending" : "paid",
        address: address as any,
        notes,
        has_food: hasFood,
      })
      .select("*")
      .single();

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId ?? null,
      puja_id: i.pujaId ?? null,
      pandit_id: i.panditId ?? null,
      name: i.name,
      variant_name: i.variantName ?? null,
      image_url: i.image ?? null,
      unit_price: i.price,
      quantity: i.quantity,
      total: i.price * i.quantity,
      item_type: i.type,
      metadata: {
        selectedItems: i.selectedItems ?? [],
        panditName: i.panditName,
        addOns: i.addOns ?? [],
        pujaDate: i.bookingDate ?? null,
        pujaTime: i.bookingTime ?? null,
      } as any,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);
    if (itemsError) {
      setLoading(false);
      toast.error(itemsError.message);
      return;
    }

    clearCart();
    setLoading(false);
    toast.success("Order placed successfully!");
    router.push(`/account/orders/${order.id}`);
  }

  async function lookupPincode(code?: string) {
    const pincode = (code ?? newAddr.pincode).trim();
    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setPincodeLoading(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await res.json();
      const result = data?.[0];
      if (result?.Status === "Success" && result.PostOffice?.length > 0) {
        const po = result.PostOffice[0];
        setNewAddr((prev) => ({
          ...prev,
          country: po.Country ?? prev.country,
          state: po.State ?? prev.state,
          district: po.District ?? prev.district,
          region: po.Region ?? prev.region,
          block: po.Block ?? prev.block,
          city: po.District ?? po.Block ?? prev.city,
        }));
        toast.success("Address details auto-filled from pincode");
      } else {
        toast.error("Invalid pincode or not found");
      }
    } catch {
      toast.error("Could not look up pincode");
    } finally {
      setPincodeLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="container-px mx-auto max-w-7xl py-6">
      <h1 className="font-display text-3xl font-semibold">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Address */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              Delivery Address
            </h2>

            {addresses.length > 0 && (
              <RadioGroup
                value={selectedAddressId}
                onValueChange={setSelectedAddressId}
                className="mt-4 space-y-2"
              >
                {addresses.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <RadioGroupItem
                      value={a.id}
                      id={`addr-${a.id}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`addr-${a.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{a.full_name}</span> ·{" "}
                      {a.phone}
                      <br />
                      {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
                      {a.city}, {a.district ? `${a.district}, ` : ""}
                      {a.state} - {a.pincode}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            <div className="mt-4 rounded-xl border border-dashed border-border p-4">
              <h3 className="text-sm font-semibold">Add new address</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="full_name" className="text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={newAddr.full_name}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, full_name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-xs">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={newAddr.phone}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, phone: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line1" className="text-xs">
                    Address Line 1
                  </Label>
                  <Input
                    id="line1"
                    value={newAddr.line1}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, line1: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line2" className="text-xs">
                    Address Line 2 (optional)
                  </Label>
                  <Input
                    id="line2"
                    value={newAddr.line2}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, line2: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode" className="text-xs">
                    Pincode
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      id="pincode"
                      value={newAddr.pincode}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6);
                        setNewAddr({ ...newAddr, pincode: val });
                        if (val.length === 6) lookupPincode(val);
                      }}
                      onBlur={(e) => lookupPincode(e.target.value)}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => lookupPincode(newAddr.pincode)}
                      disabled={
                        pincodeLoading ||
                        !/^\d{6}$/.test(newAddr.pincode.trim())
                      }
                      className="h-10 whitespace-nowrap"
                    >
                      {pincodeLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Lookup"
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="city" className="text-xs">
                    City
                  </Label>
                  <Input
                    id="city"
                    value={newAddr.city}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, city: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="district" className="text-xs">
                    District
                  </Label>
                  <Input
                    id="district"
                    value={newAddr.district}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, district: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-xs">
                    State
                  </Label>
                  <Input
                    id="state"
                    value={newAddr.state}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, state: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="region" className="text-xs">
                    Region
                  </Label>
                  <Input
                    id="region"
                    value={newAddr.region}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, region: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="block" className="text-xs">
                    Block
                  </Label>
                  <Input
                    id="block"
                    value={newAddr.block}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, block: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="country" className="text-xs">
                    Country
                  </Label>
                  <Input
                    id="country"
                    value={newAddr.country}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, country: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-3"
                onClick={saveAddress}
              >
                Save address
              </Button>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              Payment Method
            </h2>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as any)}
              className="mt-4 space-y-2"
            >
              {enabledPayments.map((p) => (
                <div
                  key={p.value}
                  className="flex items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem
                    value={p.value}
                    id={`pay-${p.value}`}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={`pay-${p.value}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <span className="font-medium">{p.label}</span>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {p.desc}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <p className="mt-3 text-xs text-muted-foreground">
              Note: This is a demo. No real payment will be processed.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Order Notes (optional)
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions..."
              className="mt-2"
            />
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              Order Summary
            </h2>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {groupItemsBySection(items).map((section) => (
                <div key={section.key} className={`overflow-hidden rounded-lg border border-border ${section.card}`}>
                  <div className={`flex items-center gap-1.5 border-b px-2 py-1.5 ${section.header}`}>
                    <section.icon className={`h-3.5 w-3.5 ${section.badge.split(' ')[1]}`} />
                    <span className="text-[11px] font-semibold">{section.label}</span>
                  </div>
                  {section.items.map((i) => (
                    <div key={i.id} className="flex justify-between bg-background px-2 py-1 text-sm">
                      <span className="pr-2">
                        {i.name} x{i.quantity}
                        {i.addOns && i.addOns.length > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {i.addOns.map((a) => a.name).join(', ')}
                          </span>
                        )}
                      </span>
                      <span className="whitespace-nowrap font-medium">
                        {formatINR(i.price * i.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {appliedCoupon && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-success">
                  Coupon &quot;{appliedCoupon}&quot; applied −{formatINR(couponDiscount)}
                </span>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-muted-foreground underline hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatINR(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatINR(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%)</span>
                <span>{formatINR(tax)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
            <Button
              onClick={placeOrder}
              disabled={loading || foodClosed}
              className="mt-5 w-full"
              size="lg"
            >
              {foodClosed
                ? "Food Section Closed"
                : loading
                  ? "Placing order..."
                  : `Place Order · ${formatINR(total)}`}
            </Button>
            {foodClosed && (
              <p className="mt-2 text-center text-xs text-destructive">
                Food orders are not accepted right now. Store hours:{" "}
                {config?.food_open_time} - {config?.food_close_time}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
