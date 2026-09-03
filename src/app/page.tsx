import { DatePresets } from "@/components/date-presets";
import { EmptyBooks, KpiCards } from "@/components/kpi-cards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, listUploads } from "@/app/actions";
import { formatBdt } from "@/lib/money";
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
  const [stats, uploads] = await Promise.all([
    getDashboardStats(range.from, range.to),
    listUploads(),
  ]);
  const empty = stats.delivery_count + stats.return_count === 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Revenue is cash Pathao collected. Net payout is what landed in your account.
          </p>
        </div>
        <DatePresets preset={preset} />
      </div>

      {empty ? <EmptyBooks /> : <KpiCards stats={stats} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Deliveries</CardDescription>
            <CardTitle className="tabular-nums">{stats.delivery_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Returns</CardDescription>
            <CardTitle className="tabular-nums">{stats.return_count}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average collected</CardDescription>
            <CardTitle className="tabular-nums">
              {formatBdt(stats.average_collected)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

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
