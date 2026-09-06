"use client";

import Link from "next/link";
import { Package, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOpeningStock } from "@/app/business-actions";
import type { StockPosition } from "@/app/actions";
import { LedgerList, type LedgerRow } from "@/components/ledger";
import { OpeningStockFields } from "@/components/opening-stock-fields";
import { PositionStat } from "@/components/position-stat";
import { Button } from "@/components/ui/button";
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

function stockRows(stock: StockPosition, countedOn: string): LedgerRow[] {
  const rows: LedgerRow[] = [
    {
      key: "opening",
      label: `Opening · ${countedOn}`,
      amount: stock.opening_stock ?? 0,
      signed: false,
    },
  ];
  if (stock.purchases_since_opening !== 0) {
    rows.push({
      key: "purchases",
      label: "Purchases",
      amount: stock.purchases_since_opening,
      role: "inflow",
    });
  }
  if (stock.adjustments_since_opening !== 0) {
    rows.push({
      key: "adjustments",
      label: "Adjustments",
      amount: stock.adjustments_since_opening,
      role: stock.adjustments_since_opening >= 0 ? "inflow" : "cost",
    });
  }
  if (stock.cogs_since_opening !== 0 || !stock.has_product_cost) {
    rows.push({
      key: "cogs",
      label: "COGS",
      amount: -stock.cogs_since_opening,
      role: "cost",
      hint: stock.has_product_cost
        ? "Product cost from the default item recipe. Returns are not added back."
        : "Set product cost in Settings so deliveries reduce stock. Returns are not added back.",
    });
  }
  rows.push({
    key: "total",
    label: "Stock on hand",
    amount: stock.stock_on_hand ?? 0,
    role: "total",
  });
  return rows;
}

export function StockPositionCard({
  stock,
  hasBusiness,
  variant = "card",
  share,
}: {
  stock: StockPosition;
  hasBusiness: boolean;
  variant?: "card" | "row";
  share?: number;
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
  const value =
    stock.is_set && stock.stock_on_hand != null
      ? formatBdt(stock.stock_on_hand)
      : "—";

  return (
    <>
      <PositionStat
        icon={Package}
        title="Stock on hand"
        value={value}
        variant={variant}
        share={share}
        warning={
          stock.is_set && negative
            ? "Stock is below zero. Add a purchase or check product cost in Settings."
            : null
        }
        action={
          hasBusiness ? (
            stock.is_set ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Edit opening stock"
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
                onClick={() => {
                  setError(null);
                  setOpen(true);
                }}
              >
                Add
              </Button>
            )
          ) : null
        }
      >
        {stock.is_set && countedOn && stock.opening_stock != null ? (
          variant === "row" ? (
            <p className="text-xs text-muted-foreground">
              Opened {countedOn}
              {!stock.has_product_cost ? " · set product cost in Settings" : null}
            </p>
          ) : (
            <>
              <LedgerList rows={stockRows(stock, countedOn)} />
              {!stock.has_product_cost ? (
                <p className="text-xs text-muted-foreground">
                  Set product cost in{" "}
                  <Link
                    href="/settings"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Settings
                  </Link>
                  .
                </p>
              ) : null}
            </>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {hasBusiness ? (
              <>
                Add opening stock at cost so this follows purchases and
                deliveries.{" "}
                <Link
                  href="/inventory"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Inventory
                </Link>
              </>
            ) : (
              "Create a business from the sidebar, then add opening stock."
            )}
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
