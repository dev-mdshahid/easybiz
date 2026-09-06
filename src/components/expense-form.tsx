"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  addExpense,
  deleteExpense,
  updateExpense,
} from "@/app/expense-actions";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  isExpenseCategory,
  type ExpenseCategory,
} from "@/lib/expense";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTodayDhaka } from "@/hooks/use-today-dhaka";
import type { Expense } from "@/lib/supabase/database.types";

function amountInputValue(value: number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function dateInputValue(value: string): string {
  return value.slice(0, 10);
}

function ExpenseFields({
  idPrefix,
  amountDefault,
  dateDefault,
  category,
  onCategoryChange,
  noteDefault,
  amountHint,
}: {
  idPrefix: string;
  amountDefault?: string;
  dateDefault: string;
  category: ExpenseCategory;
  onCategoryChange: (value: ExpenseCategory) => void;
  noteDefault?: string;
  amountHint?: string;
}) {
  const today = useTodayDhaka();

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-amount`}>Amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
            ৳
          </span>
          <Input
            id={`${idPrefix}-amount`}
            name="amount"
            inputMode="decimal"
            step="0.01"
            required
            defaultValue={amountDefault}
            placeholder="0.00"
            className="pl-6 tabular-nums"
          />
        </div>
        {amountHint ? (
          <p className="text-xs text-muted-foreground">{amountHint}</p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-date`}>Date</Label>
        <Input
          id={`${idPrefix}-date`}
          key={dateDefault || today || `${idPrefix}-date`}
          name="occurred_on"
          type="date"
          required
          defaultValue={dateDefault}
          max={today || undefined}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Category</Label>
        <Select
          value={category}
          onValueChange={(value) => {
            if (typeof value === "string" && isExpenseCategory(value)) {
              onCategoryChange(value);
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
        <Label htmlFor={`${idPrefix}-note`}>Note (optional)</Label>
        <Input
          id={`${idPrefix}-note`}
          name="note"
          defaultValue={noteDefault}
          placeholder="Ads, rent, office…"
        />
      </div>
    </>
  );
}

export function ExpenseForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const today = useTodayDhaka();

  return (
    <form
      ref={formRef}
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
          const amount = formRef.current?.elements.namedItem("amount");
          const note = formRef.current?.elements.namedItem("note");
          if (amount instanceof HTMLInputElement) amount.value = "";
          if (note instanceof HTMLInputElement) note.value = "";
        });
      }}
    >
      <ExpenseFields
        idPrefix="expense"
        dateDefault={today}
        category={category}
        onCategoryChange={setCategory}
        amountHint="This lowers cash on hand and period profit. Stock purchases stay on Inventory."
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}

export function EditExpenseButton({ row }: { row: Expense }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>(
    isExpenseCategory(row.category) ? row.category : "other",
  );

  function save(formData: FormData) {
    formData.set("id", String(row.id));
    formData.set("category", category);
    startTransition(async () => {
      const result = await updateExpense(formData);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success("Expense updated");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Edit ${EXPENSE_CATEGORY_LABELS[isExpenseCategory(row.category) ? row.category : "other"]} on ${dateInputValue(row.occurred_on)}`}
        onClick={() => {
          setError(null);
          setCategory(isExpenseCategory(row.category) ? row.category : "other");
          setOpen(true);
        }}
      >
        Edit
      </Button>
      {open ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!pending) setOpen(next);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <form className="grid gap-4" action={save}>
              <DialogHeader>
                <DialogTitle>Edit expense</DialogTitle>
                <DialogDescription>
                  Changing the amount or date updates cash on hand and period
                  profit. Dates before the opening-cash counted-on day stay
                  recorded but do not move cash.
                </DialogDescription>
              </DialogHeader>
              <ExpenseFields
                idPrefix={`expense-${row.id}`}
                amountDefault={amountInputValue(row.amount)}
                dateDefault={dateInputValue(row.occurred_on)}
                category={category}
                onCategoryChange={setCategory}
                noteDefault={row.note ?? undefined}
              />
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
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
