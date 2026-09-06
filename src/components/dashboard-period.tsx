"use client";

import { useState } from "react";
import Link from "next/link";

import type { DashboardStats } from "@/app/actions";
import {
  CollectedArea,
  CostMix,
  ProfitWaterfall,
  VolumeSplit,
} from "@/components/dashboard-charts";
import { DatePresets } from "@/components/date-presets";
import { LedgerList } from "@/components/ledger";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBdt, formatPercent } from "@/lib/money";
import { cn } from "@/lib/utils";

function marginOf(stats: DashboardStats) {
  if (stats.revenue === 0) return null;
  return (stats.operating_profit / stats.revenue) * 100;
}

export function DashboardHero({
  stats,
  preset,
}: {
  stats: DashboardStats;
  preset: string;
}) {
  const profitNegative = stats.operating_profit < 0;
  const margin = marginOf(stats);
  const onPrimary = !profitNegative;

  const muted = onPrimary ? "text-primary-foreground/70" : "text-muted-foreground";

  return (
    <section
      className={cn(
        "flex flex-col gap-5 overflow-hidden rounded-xl p-5 shadow-[0_18px_40px_-28px_oklch(0.42_0.14_252_/_0.55)] sm:p-6",
        onPrimary
          ? "bg-primary text-primary-foreground"
          : "bg-card text-card-foreground ring-1 ring-foreground/8",
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Profit
        </h2>
        <DatePresets preset={preset} tone={onPrimary ? "onPrimary" : "default"} />
      </div>

      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="grid min-w-0 gap-1.5">
          <p
            className={cn(
              "font-heading text-5xl font-bold tracking-tight tabular-nums sm:text-6xl",
              profitNegative && "text-destructive",
            )}
          >
            {formatBdt(stats.operating_profit)}
          </p>
          <p className={cn("text-sm", onPrimary ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {margin == null
              ? "No collections in this period."
              : `${formatPercent(margin)} of ${formatBdt(stats.revenue)} collected`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:max-w-xl lg:flex-1">
          <div>
            <dt className={cn("text-sm", muted)}>Net payout</dt>
            <dd className="font-medium tabular-nums tracking-tight">
              {formatBdt(stats.final_payout)}
            </dd>
          </div>
          <div>
            <dt className={cn("text-sm", muted)}>Average ticket</dt>
            <dd className="font-medium tabular-nums tracking-tight">
              {formatBdt(stats.average_collected)}
            </dd>
          </div>
          <div>
            <dt className={cn("text-sm", muted)}>Deliveries</dt>
            <dd className="font-medium tabular-nums tracking-tight">
              {stats.delivery_count}
            </dd>
          </div>
          <div>
            <dt className={cn("text-sm", muted)}>Returns</dt>
            <dd className="font-medium tabular-nums tracking-tight">
              {stats.return_count}
            </dd>
          </div>
        </dl>
      </div>

      <CollectedArea
        series={stats.series}
        tone={onPrimary ? "onPrimary" : "default"}
        className="h-52"
      />
    </section>
  );
}

export function DashboardBreakdown({ stats }: { stats: DashboardStats }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>How profit was made</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 overflow-x-auto">
          <ProfitWaterfall
            stats={stats}
            activeKey={activeKey}
            onActiveKey={setActiveKey}
          />
          <LedgerList rows={stats.statement} highlightKey={activeKey} />
        </CardContent>
        <CardFooter className="gap-3">
          <Button variant="link" size="sm" render={<Link href="/settings" />}>
            Settings
          </Button>
          <Button variant="link" size="sm" render={<Link href="/expenses" />}>
            Expenses
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Where collected went</CardTitle>
          </CardHeader>
          <CardContent>
            <CostMix
              stats={stats}
              activeKey={activeKey}
              onActiveKey={setActiveKey}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeSplit stats={stats} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
