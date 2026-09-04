import { CashPositionCard } from "@/components/cash-position";
import { DashboardPeriod } from "@/components/dashboard-period";
import { StockPositionCard } from "@/components/stock-position";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCashPosition, getDashboardStats, getStockPosition, listUploads } from "@/app/actions";
import { getBusinessContext } from "@/app/business-actions";
import { formatDhaka, rangeFromPreset, type DatePreset } from "@/lib/time";

function asPreset(value: string | undefined): DatePreset {
  if (value === "month" || value === "30d" || value === "all") return value;
  return "all";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const params = await searchParams;
  const preset = asPreset(params.preset);
  const range = rangeFromPreset(preset);
  const [{ current }, stats, cash, stock, uploads] = await Promise.all([
    getBusinessContext(),
    getDashboardStats(range.from, range.to),
    getCashPosition(),
    getStockPosition(),
    listUploads(),
  ]);
  const empty = stats.delivery_count + stats.return_count === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Cash and stock are running totals. Period figures use the date range
          below.
        </p>
      </div>

      <section className="grid gap-4">
        <h2 className="text-lg font-semibold tracking-tight">On hand</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <CashPositionCard cash={cash} hasBusiness={Boolean(current)} />
          <StockPositionCard stock={stock} hasBusiness={Boolean(current)} />
        </div>
      </section>

      <DashboardPeriod
        stats={stats}
        empty={empty}
        needsBusiness={!current}
        preset={preset}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent uploads</CardTitle>
          <CardDescription>Last 20 CSV imports</CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No uploads yet.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0"
                >
                  <span className="font-medium">{upload.filename}</span>
                  <span className="text-muted-foreground">
                    {upload.inserted_count} new · {upload.updated_count} updated ·{" "}
                    {formatDhaka(upload.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
