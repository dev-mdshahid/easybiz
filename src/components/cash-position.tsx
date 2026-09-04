"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOpeningBalance } from "@/app/business-actions";
import type { CashPosition } from "@/app/actions";
import { OpeningBalanceFields } from "@/components/opening-balance-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
}: {
  cash: CashPosition;
  hasBusiness: boolean;
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

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>Cash on hand</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
            {cash.is_set && cash.cash_on_hand != null
              ? formatBdt(cash.cash_on_hand)
              : "—"}
          </CardTitle>
          {hasBusiness ? (
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                {cash.is_set ? "Edit" : "Add opening cash"}
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-2">
          {cash.is_set && countedOn && cash.opening_balance != null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Opening {formatBdt(cash.opening_balance)} on {countedOn}
                {" · "}
                Pathao since then {formatBdt(cash.payouts_since_opening)}
              </p>
              <p className="text-xs text-muted-foreground">
                Expenses are not tracked yet, so this is opening cash plus
                Pathao consignments after that day, counted two days after the
                consignment date.
              </p>
            </>
          ) : hasBusiness ? (
            <p className="text-sm text-muted-foreground">
              Add the cash you already had so this number can follow Pathao
              consignments after that day (each counted two days later).
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a business from the sidebar, then add opening cash.
            </p>
          )}
        </CardContent>
      </Card>

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
                  Changing the date changes which consignments count toward cash
                  on hand. Each consignment is counted two days after its date.
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
