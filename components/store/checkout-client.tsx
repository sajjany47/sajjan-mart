"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  Truck,
  PhoneCall,
  MapPin,
  Plus,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Wallet,
  Clock,
  ChevronDown,
  ChevronUp,
  Building,
  Tag,
  AlertCircle,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase/client";
import { formatINR, generateOrderNumber } from "@/lib/format";
import { toast } from "sonner";
import type { Address } from "@/lib/types";
import { isFoodOpenNow, isPaymentModeAllowed, PAYMENT_METHODS, computeTotals, getTaxRate } from "@/lib/store-config-utils";
import { geocodeAddress, getDistanceInKm, OUTLET_LAT, OUTLET_LNG } from "@/lib/location-utils";
import { groupItemsBySection } from "@/lib/cart-sections";
import { getDeliveryEstimate, QUICK_SERVICE_CONTACT } from "@/lib/delivery-estimate";
import { CheckoutStepper } from "@/components/store/checkout-stepper";

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
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "razorpay" | "cashfree">("cod");
  const [config, setConfig] = useState<StoreConfigData | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

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
        const addrList = (data ?? []) as Address[];
        setAddresses(addrList);
        if (addrList.length > 0) {
          setSelectedAddressId(addrList[0].id);
        } else {
          setShowAddAddressForm(true);
        }
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
    const saved = data as Address;
    setAddresses((prev) => [...prev, saved]);
    setSelectedAddressId(saved.id);
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
    setShowAddAddressForm(false);
    toast.success("New address saved & selected");
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

    if (hasFood) {
      setLoading(true);
      const addressString = `${address.line1}, ${address.city}, ${address.pincode}, India`;
      try {
        let geocodeResult = await geocodeAddress(addressString);
        if (!geocodeResult) {
          const fallbackString = `${address.pincode}, ${address.city}, India`;
          geocodeResult = await geocodeAddress(fallbackString);
        }

        if (!geocodeResult) {
          setLoading(false);
          toast.error("Could not verify delivery address location. Please check your address format or pincode.");
          return;
        }

        const dist = getDistanceInKm(geocodeResult.lat, geocodeResult.lng, OUTLET_LAT, OUTLET_LNG);
        if (dist > 6.0) {
          setLoading(false);
          toast.error(`Checkout failed: Delivery address is outside our 6 km food delivery range (Distance: ${dist.toFixed(2)} km).`);
          return;
        }
      } catch (err) {
        setLoading(false);
        toast.error("Failed to verify delivery address range. Please check your internet connection.");
        return;
      }
    }

    setLoading(true);
    const orderNumber = generateOrderNumber();
    const orderItems = items.map((i) => ({
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
        items: orderItems,
      })
      .select("*")
      .single();

    if (error) {
      setLoading(false);
      toast.error(error.message);
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
    <div className="min-h-screen pb-16 bg-muted/20">
      <CheckoutStepper currentStep={2} />

      <div className="container-px mx-auto max-w-7xl">
        {/* Page Title */}
        <div className="py-4 mb-4 border-b border-border/40">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Select your delivery address and preferred payment option to complete your order.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Main Left Column (Address & Payment) */}
          <div className="space-y-6">
            {/* Section 1: Delivery Address */}
            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Delivery Address</h2>
                    <p className="text-xs text-muted-foreground">Where should we deliver your order?</p>
                  </div>
                </div>

                {addresses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddAddressForm((prev) => !prev)}
                    className="text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    {showAddAddressForm ? (
                      <span className="flex items-center gap-1">
                        <ChevronUp className="h-4 w-4" /> Hide Form
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Plus className="h-4 w-4" /> Add New Address
                      </span>
                    )}
                  </Button>
                )}
              </div>

              {/* Saved Address Selection */}
              {addresses.length > 0 && (
                <div className="mt-5 space-y-3">
                  <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-3">
                    {addresses.map((a) => {
                      const isSelected = selectedAddressId === a.id;
                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAddressId(a.id)}
                          className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20"
                              : "border-border/80 bg-background/60 hover:border-border hover:bg-background"
                          }`}
                        >
                          <RadioGroupItem value={a.id} id={`addr-${a.id}`} className="mt-1" />
                          <Label htmlFor={`addr-${a.id}`} className="flex-1 cursor-pointer space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">{a.full_name}</span>
                                {a.is_default && (
                                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                                    Default
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground">{a.phone}</span>
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                              {a.line1}, {a.line2 ? `${a.line2}, ` : ""}
                              {a.city}, {a.district ? `${a.district}, ` : ""}
                              {a.state} - <strong className="text-foreground">{a.pincode}</strong>
                            </p>
                          </Label>

                          {isSelected && (
                            <div className="absolute top-3 right-3 text-primary">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              )}

              {/* Add New Address Form (Collapsible) */}
              {(showAddAddressForm || addresses.length === 0) && (
                <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      {addresses.length === 0 ? "Add your primary delivery address" : "Add a new delivery address"}
                    </h3>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="full_name" className="text-xs font-semibold">
                        Full Name *
                      </Label>
                      <Input
                        id="full_name"
                        placeholder="e.g. Sajjan Kumar"
                        value={newAddr.full_name}
                        onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-xs font-semibold">
                        Mobile Number *
                      </Label>
                      <Input
                        id="phone"
                        placeholder="10-digit mobile number"
                        value={newAddr.phone}
                        onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="line1" className="text-xs font-semibold">
                        Flat / House No. / Building / Street *
                      </Label>
                      <Input
                        id="line1"
                        placeholder="e.g. 51/1A Satish Mukherjee Road"
                        value={newAddr.line1}
                        onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="line2" className="text-xs font-semibold">
                        Landmark / Area / Colony (Optional)
                      </Label>
                      <Input
                        id="line2"
                        placeholder="e.g. Near Kalighat Metro Station"
                        value={newAddr.line2}
                        onChange={(e) => setNewAddr({ ...newAddr, line2: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="pincode" className="text-xs font-semibold">
                        Pincode (6 digits) *
                      </Label>
                      <div className="mt-1 flex gap-2">
                        <Input
                          id="pincode"
                          value={newAddr.pincode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setNewAddr({ ...newAddr, pincode: val });
                            if (val.length === 6) lookupPincode(val);
                          }}
                          onBlur={(e) => lookupPincode(e.target.value)}
                          placeholder="700026"
                          maxLength={6}
                          className="flex-1 text-xs bg-background font-mono font-bold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => lookupPincode(newAddr.pincode)}
                          disabled={pincodeLoading || !/^\d{6}$/.test(newAddr.pincode.trim())}
                          className="h-9 px-3 text-xs whitespace-nowrap bg-background font-semibold"
                        >
                          {pincodeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Lookup"}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="city" className="text-xs font-semibold">
                        City / Town *
                      </Label>
                      <Input
                        id="city"
                        value={newAddr.city}
                        onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="district" className="text-xs font-semibold">
                        District *
                      </Label>
                      <Input
                        id="district"
                        value={newAddr.district}
                        onChange={(e) => setNewAddr({ ...newAddr, district: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>

                    <div>
                      <Label htmlFor="state" className="text-xs font-semibold">
                        State *
                      </Label>
                      <Input
                        id="state"
                        value={newAddr.state}
                        onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                        className="mt-1 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <Button onClick={saveAddress} size="sm" className="font-semibold text-xs px-5 shadow-sm">
                      Save &amp; Deliver Here
                    </Button>
                    {addresses.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddAddressForm(false)}
                        className="text-xs text-muted-foreground"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Section 2: Delivery Speed & Timelines */}
            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Delivery Timelines</h2>
                  <p className="text-xs text-muted-foreground">Estimated arrival by item section</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {groupItemsBySection(items).map((section) => (
                  <div
                    key={section.key}
                    className={`flex items-start gap-3 rounded-xl border p-3.5 ${section.card}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs border border-border/50">
                      <section.icon className={`h-4 w-4 ${section.badge.split(" ")[1]}`} />
                    </span>
                    <div>
                      <span className="text-xs font-bold text-foreground block">{section.label}</span>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {getDeliveryEstimate(section.key).detail}
                      </p>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {section.items.length} item(s) included
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Payment Method */}
            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">Payment Method</h2>
                    <p className="text-xs text-muted-foreground">Select how you would like to pay</p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% Encrypted
                </span>
              </div>

              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as any)}
                className="mt-5 space-y-3"
              >
                {enabledPayments.map((p) => {
                  const isSelected = paymentMethod === p.value;
                  const isCod = p.value === "cod";

                  return (
                    <div
                      key={p.value}
                      onClick={() => setPaymentMethod(p.value as any)}
                      className={`relative flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20"
                          : "border-border/80 bg-background/60 hover:border-border hover:bg-background"
                      }`}
                    >
                      <RadioGroupItem value={p.value} id={`pay-${p.value}`} className="mt-1" />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isCod ? (
                            <Wallet className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-primary" />
                          )}
                          <span className="font-bold text-sm text-foreground">{p.label}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                      </div>

                      {isSelected && (
                        <div className="text-primary shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>

              <div className="mt-4 rounded-xl bg-muted/60 p-3 text-[11px] text-muted-foreground flex items-center gap-2 border border-border/40">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Demo Mode Active: No real money will be charged from your account when placing this order.
                </span>
              </div>
            </section>

            {/* Section 4: Order Notes */}
            <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2.5 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <Label htmlFor="notes" className="text-sm font-bold text-foreground">
                  Special Delivery Instructions (Optional)
                </Label>
              </div>

              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Leave at front door, ring bell twice, call before arrival..."
                className="text-xs bg-background"
              />
            </section>
          </div>

          {/* Right Column - Order Summary Sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-lg shadow-black/5 backdrop-blur-md">
              <h2 className="font-display text-lg font-bold tracking-tight border-b border-border/50 pb-3 flex items-center justify-between">
                <span>Order Items Breakdown</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {items.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </h2>

              {/* Scrollable Item Preview List */}
              <div className="mt-4 max-h-72 overflow-y-auto pr-1 space-y-3">
                {groupItemsBySection(items).map((section) => (
                  <div key={section.key} className="overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                    <div className={`flex items-center gap-2 border-b px-3 py-1.5 ${section.header}`}>
                      <section.icon className={`h-3.5 w-3.5 ${section.badge.split(" ")[1]}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider">{section.label}</span>
                    </div>

                    <div className="divide-y divide-border/40 bg-card">
                      {section.items.map((i) => (
                        <div key={i.id} className="flex items-center justify-between p-2.5 text-xs">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted border border-border/50">
                              {i.image ? (
                                <Image src={i.image} alt={i.name} fill sizes="40px" className="object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                  <ShoppingBag className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="truncate">
                              <span className="font-semibold text-foreground block truncate">{i.name}</span>
                              <span className="text-[10px] text-muted-foreground block">
                                Qty: {i.quantity} × {formatINR(i.price)}
                              </span>
                              {i.addOns && i.addOns.length > 0 && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 block truncate">
                                  +{i.addOns.map((a) => a.name).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-foreground shrink-0 pl-2">
                            {formatINR(i.price * i.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Applied Coupon Info */}
              {appliedCoupon && (
                <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Coupon &quot;{appliedCoupon}&quot; (-{formatINR(couponDiscount)})
                  </span>
                  <button
                    onClick={removeCoupon}
                    className="text-[11px] font-semibold text-destructive underline hover:no-underline"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* Price Calculation Table */}
              <div className="mt-5 space-y-2.5 border-t border-border/50 pt-4 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="font-semibold text-foreground">{formatINR(subtotal)}</span>
                </div>

                {couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Coupon Savings</span>
                    <span className="font-bold">-{formatINR(couponDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Charge</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase">FREE</span>
                    ) : (
                      <span className="font-semibold text-foreground">{formatINR(shipping)}</span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-muted-foreground">
                  <span>Taxes (0% GST)</span>
                  <span>{formatINR(tax)}</span>
                </div>

                <div className="border-t border-border/80 pt-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-bold text-foreground block">Total Payable</span>
                      <span className="text-[10px] text-muted-foreground">Includes all taxes</span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-extrabold text-primary font-sans tracking-tight pl-1">
                      {formatINR(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Support info */}
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 p-2.5 text-xs text-muted-foreground">
                <PhoneCall className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-[11px]">{QUICK_SERVICE_CONTACT}</span>
              </div>

              {/* Place Order CTA Button */}
              <Button
                onClick={placeOrder}
                disabled={loading || foodClosed}
                className="mt-5 w-full font-bold text-sm py-6 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                size="lg"
              >
                {foodClosed ? (
                  "Food Section Closed"
                ) : loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying &amp; Placing Order...
                  </span>
                ) : (
                  `Place Order · ${formatINR(total)}`
                )}
              </Button>

              {foodClosed && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center text-xs text-destructive">
                  <p className="font-bold">Food Section Currently Closed</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Store Hours: {config?.food_open_time} - {config?.food_close_time}
                  </p>
                </div>
              )}

              {/* Safety Footer */}
              <div className="mt-5 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>256-bit SSL Encrypted &amp; Secure Checkout</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Fixed Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/80 bg-card/95 p-3.5 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Payable</span>
            <span className="font-sans text-xl font-extrabold text-primary tracking-tight pl-0.5">{formatINR(total)}</span>
          </div>

          <Button
            onClick={placeOrder}
            disabled={loading || foodClosed}
            className="flex-1 font-bold text-sm h-11 shadow-md shadow-primary/25"
          >
            {foodClosed ? "Food Closed" : loading ? "Placing..." : `Place Order · ${formatINR(total)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
