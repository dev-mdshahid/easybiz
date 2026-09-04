import Link from "next/link";

import type { DashboardStats } from "@/app/actions";
import { DatePresets } from "@/components/date-presets";
import { EmptyBooks } from "@/components/kpi-cards";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBdt } from "@/lib/money";
import { cn } from "@/lib/utils";

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function DashboardPeriod({
  stats,
  empty,
  needsBusiness,
  preset,
}: {
  stats: DashboardStats;
  empty: boolean;
  needsBusiness: boolean;
  preset: string;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">This period</h2>
          <p className="text-sm text-muted-foreground">
            Pathao cash, the default item recipe, and logged expenses. Date
            range does not change cash on hand or stock.
          </p>
        </div>
        <DatePresets preset={preset} />
      </div>

      {empty ? (
        <EmptyBooks needsBusiness={needsBusiness} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Pathao</CardTitle>
              <CardDescription>
                Collected − delivery charge − return fees = net payout
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <MiniStat
                  label="Collected"
                  value={formatBdt(stats.revenue)}
                  hint="From Pathao deliveries"
                />
                <MiniStat
                  label="Net payout"
                  value={formatBdt(stats.final_payout)}
                  hint="Collected − delivery charge − return fees"
                />
                <MiniStat
                  label="Delivery charge"
                  value={formatBdt(stats.pathao_cost)}
                  hint="Pathao fee on deliveries"
                />
                <MiniStat
                  label="Return fees"
                  value={formatBdt(stats.return_cost)}
                  hint="Pathao fee on returns"
                />
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                <MiniStat label="Deliveries" value={String(stats.delivery_count)} />
                <MiniStat label="Returns" value={String(stats.return_count)} />
                <MiniStat
                  label="Average"
                  value={formatBdt(stats.average_collected)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-3">
            <CardHeader>
              <CardDescription>Profit</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatBdt(stats.operating_profit)}
              </CardTitle>
              <CardDescription>
                After costs is net payout minus packaging and other costs.
                Product and profit percents apply to after costs. Logged
                expenses come off recipe profit.{" "}
                <Link
                  href="/settings"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Settings
                </Link>
                {" · "}
                <Link
                  href="/expenses"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Expenses
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid text-sm">
                {stats.statement.map((row) => (
                  <li
                    key={row.key}
                    className={cn(
                      "flex items-start justify-between gap-4 border-b border-border py-2 last:border-0",
                      row.role === "subtotal" &&
                        "rounded-md bg-muted/60 font-medium -mx-2 px-2",
                      row.role === "total" && "border-t-2 border-border font-semibold",
                      row.role === "note" && "pl-4 text-muted-foreground",
                    )}
                  >
                    <span>
                      {row.label}
                      {row.hint ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {row.hint}
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{formatBdt(row.amount)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
