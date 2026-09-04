"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { addExpense, deleteExpense } from "@/app/expense-actions";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { todayDhaka } from "@/lib/time";

export function ExpenseForm() {
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>(
    "other",
  );
  const today = todayDhaka();

  return (
    <form
      className="grid gap-3"
      action={(formData) => {
        formData.set("category", category);
        startTransition(async () => {
          const result = await addExpense(formData);
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          setError(null);
          toast.success("Expense recorded");
          if (amountRef.current) amountRef.current.value = "";
          if (noteRef.current) noteRef.current.value = "";
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="expense-amount">Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            ref={amountRef}
            id="expense-amount"
            name="amount"
            inputMode="decimal"
            step="0.01"
            required
            placeholder="0.00"
            className="pl-6 tabular-nums"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This lowers cash on hand and period profit. Stock purchases stay on
          Inventory.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="expense-date">Date</Label>
        <Input
          id="expense-date"
          name="occurred_on"
          type="date"
          required
          defaultValue={today}
          max={today}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Category</Label>
        <Select
          value={category}
          onValueChange={(value) => {
            if (typeof value === "string") {
              setCategory(value as (typeof EXPENSE_CATEGORIES)[number]);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>
                {EXPENSE_CATEGORY_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="expense-note">Note (optional)</Label>
        <Input
          ref={noteRef}
          id="expense-note"
          name="note"
          placeholder="Ads, rent, office…"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteExpenseButton({
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
          const result = await deleteExpense(id);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Expense deleted");
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
