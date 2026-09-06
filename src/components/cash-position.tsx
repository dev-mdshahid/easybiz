"use client";

import { Banknote, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOpeningBalance } from "@/app/business-actions";
import type { CashPosition } from "@/app/actions";
import { LedgerList } from "@/components/ledger";
import { MetricBreakdown } from "@/components/metric-breakdown";
import { OpeningBalanceFields } from "@/components/opening-balance-fields";
import { PositionStat } from "@/components/position-stat";
import { Button } from "@/components/ui/button";
import { CASH_FORMULA, cashRows } from "@/lib/position-ledgers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBdt } from "@/lib/money";
import { formatDhakaDay } from "@/lib/time";

function amountInputValue(value: number | null): string | undefined {
  if (value == null) return undefined;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function CashPositionCard({
  cash,
  hasBusiness,
  variant = "card",
  share,
  tone = "default",
}: {
  cash: CashPosition;
  hasBusiness: boolean;
  variant?: "card" | "row";
  share?: number;
  tone?: "default" | "onWell";
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await updateOpeningBalance(formData);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success("Opening cash saved");
    });
  }

  const countedOn =
    cash.is_set && cash.opening_balance_on
      ? formatDhakaDay(cash.opening_balance_on)
      : null;
  const negative = (cash.cash_on_hand ?? 0) < 0;
  const value =
    cash.is_set && cash.cash_on_hand != null
      ? formatBdt(cash.cash_on_hand)
      : "—";

  return (
    <>
      <PositionStat
        icon={Banknote}
        title="Cash on hand"
        value={value}
        variant={variant}
        share={share}
        tone={tone}
        warning={
          cash.is_set && negative
            ? "Cash is below zero. Check opening cash, stock purchases, or expenses."
            : null
        }
        action={
          <span className="flex shrink-0 items-center">
            {variant === "row" && cash.is_set && countedOn ? (
              <MetricBreakdown
                title="Cash on hand"
                formula={CASH_FORMULA}
                rows={cashRows(cash, countedOn)}
                tone={tone}
              />
            ) : null}
            {hasBusiness ? (
              cash.is_set ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit opening cash"
                  className={
                    tone === "onWell"
                      ? "text-current hover:bg-background/10 hover:text-current"
                      : undefined
                  }
                  onClick={() => {
                    setError(null);
                    setOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={
                    tone === "onWell"
                      ? "border-transparent bg-background text-foreground hover:bg-background/90"
                      : undefined
                  }
                  onClick={() => {
                    setError(null);
                    setOpen(true);
                  }}
                >
                  Add
                </Button>
              )
            ) : null}
          </span>
        }
      >
        {cash.is_set && countedOn && cash.opening_balance != null ? (
          variant === "row" ? (
            <p className={tone === "onWell" ? "text-xs text-current/65" : "text-xs text-muted-foreground"}>
              Opened {countedOn}
            </p>
          ) : (
            <LedgerList rows={cashRows(cash, countedOn)} />
          )
        ) : (
          <p className={tone === "onWell" ? "text-sm text-current/70" : "text-sm text-muted-foreground"}>
            {hasBusiness
              ? "Add opening cash so this follows Pathao, loans, stock, and expenses."
              : "Create a business from the sidebar, then add opening cash."}
          </p>
        )}
      </PositionStat>

      {open ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!pending) setOpen(next);
          }}
        >
          <DialogContent>
            <form className="grid gap-4" action={save}>
              <DialogHeader>
                <DialogTitle>
                  {cash.is_set ? "Edit opening cash" : "Add opening cash"}
                </DialogTitle>
                <DialogDescription>
                  Changing the date changes which Pathao payouts, loans, stock
                  purchases, expenses, and repayments count toward cash on
                  hand. Each consignment is counted two days after its date.
                  Purchases, expenses, and loans use their date.
                </DialogDescription>
              </DialogHeader>
              <OpeningBalanceFields
                required
                amountDefault={amountInputValue(cash.opening_balance)}
                dateDefault={cash.opening_balance_on ?? undefined}
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
