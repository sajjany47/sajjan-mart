'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/format';
import { ShoppingBag } from 'lucide-react';

export interface AddOnOption {
  id: string;
  name: string;
  price: number;
}

interface Props {
  productName: string;
  basePrice: number;
  quantity: number;
  addOns: AddOnOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (addOns: AddOnOption[], unitPrice: number) => void;
}

export function AddonDialog({
  productName,
  basePrice,
  quantity,
  addOns,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  const chosen = addOns.filter((a) => selected.includes(a.id));
  const addonPrice = chosen.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = basePrice + addonPrice;
  const total = unitPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize {productName}</DialogTitle>
        </DialogHeader>

        <p className="-mt-2 text-sm text-muted-foreground">
          Select any optional add-ons. Click add to cart when done.
        </p>

        <div className="space-y-2">
          {addOns.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                selected.includes(a.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40'
              }`}
            >
              <Checkbox
                checked={selected.includes(a.id)}
                onCheckedChange={() => toggle(a.id)}
              />
              <span className="flex-1 text-sm font-medium">{a.name}</span>
              <span className="text-xs text-muted-foreground">+ {formatINR(a.price)}</span>
            </label>
          ))}
        </div>

        {chosen.length > 0 && (
          <div className="rounded-lg bg-muted/40 p-3 text-sm">
            {chosen.map((a) => (
              <div key={a.id} className="flex justify-between py-0.5">
                <span>{a.name}</span>
                <span>+ {formatINR(a.price)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span>
            {productName} · Qty {quantity}
          </span>
          <span className="text-base font-semibold">{formatINR(total)}</span>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onConfirm(chosen, unitPrice)}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Add to Cart · {formatINR(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}