import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PositionStat({
  icon: Icon,
  title,
  value,
  action,
  warning,
  children,
  variant = "card",
  share,
  shareTone = "asset",
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  action?: ReactNode;
  warning?: string | null;
  children?: ReactNode;
  variant?: "card" | "row";
  share?: number;
  shareTone?: "asset" | "owe";
}) {
  const bar =
    share != null ? (
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        <div
          className={cn(
            "h-full rounded-full",
            shareTone === "owe" ? "bg-destructive/80" : "bg-primary",
          )}
          style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
        />
      </div>
    ) : null;

  if (variant === "row") {
    return (
      <div className="border-b border-border py-2.5 last:border-b-0 last:pb-0 first:pt-0">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          >
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{title}</p>
            {children}
          </div>
          <p
            className={cn(
              "text-base font-semibold tabular-nums tracking-tight",
              warning ? "text-destructive" : null,
            )}
          >
            {value}
          </p>
          {action}
        </div>
        {bar ? <div className="mt-2 pl-10">{bar}</div> : null}
        {warning ? (
          <p className="mt-1.5 pl-10 text-xs text-destructive">{warning}</p>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="grid gap-1">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
            >
              <Icon className="size-3.5" />
            </span>
            <CardTitle>{title}</CardTitle>
          </div>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              warning ? "text-destructive" : null,
            )}
          >
            {value}
          </p>
        </div>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children || warning ? (
        <CardContent className="grid gap-3">
          {children}
          {warning ? (
            <p className="text-xs text-destructive">{warning}</p>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
