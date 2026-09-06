"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTodayDhaka } from "@/hooks/use-today-dhaka";

export function OpeningStockFields({
  amountDefault,
  dateDefault,
  required,
  optionalHint,
}: {
  amountDefault?: string;
  dateDefault?: string;
  required: boolean;
  optionalHint?: boolean;
}) {
  const today = useTodayDhaka();

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="opening_stock">
          Opening stock{optionalHint ? " (optional)" : ""}
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            id="opening_stock"
            name="opening_stock"
            inputMode="decimal"
            min="0"
            step="0.01"
            required={required}
            defaultValue={amountDefault}
            placeholder="0.00"
            className="pl-6 tabular-nums"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="opening_stock_on">Stock counted on</Label>
        <Input
          id="opening_stock_on"
          key={today || "opening-stock-on"}
          name="opening_stock_on"
          type="date"
          required={required}
          defaultValue={dateDefault ?? (required ? today : "")}
          max={today || undefined}
        />
        <p className="text-xs text-muted-foreground">
          Goods you had at the start of this day, at cost. Purchases,
          adjustments, and deliveries on this day and after are included.
          Returns are not restored automatically.
        </p>
      </div>
    </div>
  );
}
