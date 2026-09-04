"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOpeningStock } from "@/app/business-actions";
import type { StockPosition } from "@/app/actions";
import { OpeningStockFields } from "@/components/opening-stock-fields";
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

export function StockPositionCard({
  stock,
  hasBusiness,
}: {
  stock: StockPosition;
  hasBusiness: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(formData: FormData) {
    startTransition(async () => {
      const result = await updateOpeningStock(formData);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      setOpen(false);
      toast.success("Opening stock saved");
    });
  }

  const countedOn =
    stock.is_set && stock.opening_stock_on
      ? formatDhakaDay(stock.opening_stock_on)
      : null;
  const negative = (stock.stock_on_hand ?? 0) < 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardDescription>Stock on hand</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
            {stock.is_set && stock.stock_on_hand != null
              ? formatBdt(stock.stock_on_hand)
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
                {stock.is_set ? "Edit" : "Add opening stock"}
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-2">
          {stock.is_set && countedOn && stock.opening_stock != null ? (
            <>
              <p className="text-sm text-muted-foreground">
                Opening {formatBdt(stock.opening_stock)} on {countedOn}
                {" · "}
                Purchases {formatBdt(stock.purchases_since_opening)}
                {" · "}
                COGS {formatBdt(stock.cogs_since_opening)}
                {stock.adjustments_since_opening !== 0
                  ? ` · Adjustments ${formatBdt(stock.adjustments_since_opening)}`
                  : ""}
              </p>
              {negative ? (
                <p className="text-xs text-destructive">
                  Stock is below zero. Add a purchase or check product cost in
                  Settings.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {stock.has_product_cost
                  ? "COGS is product cost from the default item recipe on and after that day. Returns are not added back."
                  : "Set product cost in Settings so Pathao deliveries reduce stock. Returns are not added back."}{" "}
                <Link
                  href="/settings"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Settings
                </Link>
              </p>
            </>
          ) : hasBusiness ? (
            <p className="text-sm text-muted-foreground">
              Add the stock you already had, at cost, so this number can follow
              purchases and Pathao deliveries.{" "}
              <Link
                href="/inventory"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Inventory
              </Link>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a business from the sidebar, then add opening stock.
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
                  {stock.is_set ? "Edit opening stock" : "Add opening stock"}
                </DialogTitle>
                <DialogDescription>
                  Changing the date changes which deliveries, purchases, and
                  adjustments count. Goods leave on the consignment date, not
                  two days later.
                </DialogDescription>
              </DialogHeader>
              <OpeningStockFields
                required
                amountDefault={amountInputValue(stock.opening_stock)}
                dateDefault={stock.opening_stock_on ?? undefined}
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
