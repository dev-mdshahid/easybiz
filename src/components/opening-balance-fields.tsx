import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { todayDhaka } from "@/lib/time";

export function OpeningBalanceFields({
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
  const today = todayDhaka();

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="opening_balance">
          Opening cash{optionalHint ? " (optional)" : ""}
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            id="opening_balance"
            name="opening_balance"
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
        <Label htmlFor="opening_balance_on">Counted on</Label>
        <Input
          id="opening_balance_on"
          name="opening_balance_on"
          type="date"
          required={required}
          defaultValue={dateDefault ?? (required ? today : "")}
          max={today}
        />
        <p className="text-xs text-muted-foreground">
          Cash you had at the start of this day. Pathao payouts land two days
          after the consignment date (1 Sept counts as 3 Sept). Stock purchases
          and logged expenses on this day and after come out of this cash.
          Stock adjustments do not change cash.
        </p>
      </div>
    </div>
  );
}
