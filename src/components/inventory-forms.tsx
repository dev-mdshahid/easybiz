"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addInventoryMovement,
  deleteInventoryMovement,
} from "@/app/inventory-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayDhaka } from "@/lib/time";

function MovementForm({
  kind,
  title,
  amountLabel,
  amountHint,
}: {
  kind: "purchase" | "adjustment";
  title: string;
  amountLabel: string;
  amountHint: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = todayDhaka();

  return (
    <form
      className="grid gap-3"
      action={(formData) => {
        startTransition(async () => {
          const result = await addInventoryMovement(formData);
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          setError(null);
          toast.success(kind === "purchase" ? "Purchase recorded" : "Adjustment recorded");
        });
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm font-medium">{title}</p>
      <div className="grid gap-1.5">
        <Label htmlFor={`${kind}-amount`}>{amountLabel}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            id={`${kind}-amount`}
            name="amount"
            inputMode="decimal"
            step="0.01"
            required
            placeholder={kind === "purchase" ? "0.00" : "-500"}
            className="pl-6 tabular-nums"
          />
        </div>
        <p className="text-xs text-muted-foreground">{amountHint}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${kind}-date`}>Date</Label>
        <Input
          id={`${kind}-date`}
          name="occurred_on"
          type="date"
          required
          defaultValue={today}
          max={today}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${kind}-note`}>Note (optional)</Label>
        <Input id={`${kind}-note`} name="note" placeholder="Supplier, damage, return…" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : kind === "purchase" ? "Add purchase" : "Add adjustment"}
        </Button>
      </div>
    </form>
  );
}

export function PurchaseForm() {
  return (
    <MovementForm
      kind="purchase"
      title="Add purchase"
      amountLabel="Amount at cost"
      amountHint="This raises stock and lowers cash on hand. It is not a profit expense."
    />
  );
}

export function AdjustmentForm() {
  return (
    <MovementForm
      kind="adjustment"
      title="Add adjustment"
      amountLabel="Amount (signed)"
      amountHint="Use a positive amount when goods come back, negative for damage or count fixes."
    />
  );
}

export function DeleteMovementButton({
  id,
  label,
}: {
  id: number;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-label={`Delete ${label}`}
      onClick={() => {
        startTransition(async () => {
          const result = await deleteInventoryMovement(id);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Movement deleted");
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
