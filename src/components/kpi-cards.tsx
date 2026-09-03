import Link from "next/link";

import { formatBdt } from "@/lib/money";
import type { DashboardStats } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function KpiCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      label: "Revenue",
      value: formatBdt(stats.revenue),
      hint: "Collected from customers on deliveries",
    },
    {
      label: "Pathao cost",
      value: formatBdt(stats.pathao_cost),
      hint: "Final fee after Pathao discounts",
    },
    {
      label: "Net payout",
      value: formatBdt(stats.profit),
      hint: "What Pathao paid you",
    },
    {
      label: "Liabilities",
      value: formatBdt(stats.liabilities),
      hint: `Uncollected ${formatBdt(stats.uncollected)} · Owed to Pathao ${formatBdt(stats.owed_to_pathao)}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums tracking-tight">
              {card.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmptyBooks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No invoices yet</CardTitle>
        <CardDescription>
          Upload a Pathao paid-invoice CSV to see revenue, fees, and payout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/upload"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Go to Upload
        </Link>
      </CardContent>
    </Card>
  );
}
