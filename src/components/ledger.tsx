"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBdt } from "@/lib/money";
import { cn } from "@/lib/utils";

export type LedgerRole = "inflow" | "cost" | "note" | "subtotal" | "total";

export type LedgerRow = {
  key: string;
  label: string;
  amount: number;
  role?: LedgerRole;
  hint?: string;
  signed?: boolean;
};

function formatSignedBdt(value: number): string {
  if (value > 0) return `+${formatBdt(value)}`;
  return formatBdt(value);
}

function amountText(row: LedgerRow): string {
  const signed =
    row.signed ?? (row.role === "inflow" || row.role === "cost");
  return signed ? formatSignedBdt(row.amount) : formatBdt(row.amount);
}

function Hint({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`${label} details`}
            className="text-muted-foreground"
          />
        }
      >
        <CircleHelp />
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function LedgerList({
  rows,
  className,
  highlightKey,
}: {
  rows: LedgerRow[];
  className?: string;
  highlightKey?: string | null;
}) {
  return (
    <ul className={cn("grid text-sm", className)}>
      {rows.map((row) => {
        const role = row.role ?? "inflow";
        const highlighted = highlightKey != null && highlightKey === row.key;
        return (
          <li
            key={row.key}
            className={cn(
              "flex items-center justify-between gap-3 py-1.5",
              role === "subtotal" &&
                "my-0.5 rounded-md bg-muted/70 px-2 font-medium -mx-2",
              role === "total" &&
                "mt-1 border-t border-border pt-2 font-semibold",
              role === "note" && "text-xs text-muted-foreground",
              highlighted && "rounded-md bg-primary/10 px-2 -mx-2",
            )}
          >
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate">{row.label}</span>
              {row.hint ? <Hint label={row.label} hint={row.hint} /> : null}
            </span>
            <span
              className={cn(
                "tabular-nums tracking-tight",
                role === "total" && "text-primary",
              )}
            >
              {amountText(row)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
