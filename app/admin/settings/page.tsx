'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { PageLoader } from '@/components/ui/page-loader';
import { isFoodOpenNow } from '@/lib/store-config-utils';

interface StoreConfigData {
  id: string;
  food_open_time: string;
  food_close_time: string;
  food_is_open: boolean;
  payment_mode: 'offline' | 'online' | 'both';
  tax_rate: number;
  shipping_charge: number;
  free_shipping_threshold: number;
}

const PAYMENT_OPTIONS = [
  { value: 'both', label: 'Online + Offline', desc: 'Accept COD, Razorpay and Cashfree' },
  { value: 'online', label: 'Online only', desc: 'Accept Razorpay and Cashfree (no COD)' },
  { value: 'offline', label: 'Offline only', desc: 'Accept Cash on Delivery only' },
];

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<StoreConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').single();
    setConfig((data ?? null) as StoreConfigData | null);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({
        food_open_time: config.food_open_time,
        food_close_time: config.food_close_time,
        food_is_open: config.food_is_open,
        payment_mode: config.payment_mode,
        tax_rate: config.tax_rate,
        shipping_charge: config.shipping_charge,
        free_shipping_threshold: config.free_shipping_threshold,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Settings saved');
    load();
  }

  if (loading) return <PageLoader text="Loading settings..." />;
  if (!config) return <PageLoader text="No configuration found..." />;

  const foodOpen = isFoodOpenNow(config);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Store-wide configuration.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving...</> : 'Save settings'}
        </Button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Food section hours */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Food Section Hours</h2>
            <Badge className={foodOpen ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}>
              {foodOpen ? 'Open now' : 'Closed now'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            When closed, customers cannot place food orders. Other sections are not affected.
          </p>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
            <Switch
              checked={config.food_is_open}
              onCheckedChange={(v) => setConfig({ ...config, food_is_open: v })}
              id="food-open"
            />
            <Label htmlFor="food-open" className="cursor-pointer text-sm font-medium">
              Food section enabled
            </Label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="open-time" className="text-xs">Opening Time</Label>
              <Input
                id="open-time"
                type="time"
                value={config.food_open_time}
                onChange={(e) => setConfig({ ...config, food_open_time: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="close-time" className="text-xs">Closing Time</Label>
              <Input
                id="close-time"
                type="time"
                value={config.food_close_time}
                onChange={(e) => setConfig({ ...config, food_close_time: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Supports overnight hours (e.g. 22:00 - 02:00).
          </p>
        </section>

        {/* Payment methods */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Accepted Payment Methods</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose which payment methods customers can use at checkout.
          </p>

          <RadioGroup
            value={config.payment_mode}
            onValueChange={(v) => setConfig({ ...config, payment_mode: v as any })}
            className="mt-4 space-y-2"
          >
            {PAYMENT_OPTIONS.map((p) => (
              <div
                key={p.value}
                className="flex items-start gap-3 rounded-xl border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value={p.value} id={`paymode-${p.value}`} className="mt-1" />
                <Label htmlFor={`paymode-${p.value}`} className="flex-1 cursor-pointer text-sm">
                  <span className="font-medium">{p.label}</span>
                  <br />
                  <span className="text-xs text-muted-foreground">{p.desc}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </section>

        {/* Tax & delivery */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold">Tax &amp; Delivery Charges</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            These values are used to compute the order total at cart and checkout.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="tax-rate" className="text-xs">Tax rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                min={0}
                step={0.5}
                value={config.tax_rate}
                onChange={(e) => setConfig({ ...config, tax_rate: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="shipping-charge" className="text-xs">Delivery charge (Rs)</Label>
              <Input
                id="shipping-charge"
                type="number"
                min={0}
                step={1}
                value={config.shipping_charge}
                onChange={(e) => setConfig({ ...config, shipping_charge: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="free-shipping-threshold" className="text-xs">Free delivery above (Rs)</Label>
              <Input
                id="free-shipping-threshold"
                type="number"
                min={0}
                step={1}
                value={config.free_shipping_threshold}
                onChange={(e) => setConfig({ ...config, free_shipping_threshold: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Set the free delivery threshold to 0 to always charge the delivery fee.
          </p>
        </section>
      </div>
    </div>
  );
}
