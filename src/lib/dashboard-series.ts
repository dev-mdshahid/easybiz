import { dhakaYmd, nextDhakaYmd } from "@/lib/time";
import { roundMoney } from "@/lib/cost-recipe";

export type InvoiceSlice = {
  collected_amount: number;
  created_at: string;
  invoice_type: string;
};

export type DashboardDay = {
  day: string;
  fromDay: string;
  toDay: string;
  collected: number;
  deliveries: number;
  returns: number;
};

export type MixSlice = {
  key: string;
  label: string;
  amount: number;
};

export type WaterfallBar = {
  key: string;
  label: string;
  amount: number;
  from: number;
  to: number;
  role: "inflow" | "cost" | "total";
};

function emptyDay(day: string): DashboardDay {
  return { day, fromDay: day, toDay: day, collected: 0, deliveries: 0, returns: 0 };
}

function withDayRange(point: DashboardDay): DashboardDay {
  return {
    ...point,
    fromDay: point.fromDay || point.day,
    toDay: point.toDay || point.day,
  };
}

export function fillDashboardDays(days: DashboardDay[]): DashboardDay[] {
  if (days.length <= 1) return days.map(withDayRange);
  const filled: DashboardDay[] = [];
  const byDay = new Map(days.map((point) => [point.day, point]));
  let cursor = days[0].day;
  const last = days[days.length - 1].day;
  while (cursor <= last) {
    const point = byDay.get(cursor);
    filled.push(point ? withDayRange(point) : emptyDay(cursor));
    cursor = nextDhakaYmd(cursor);
  }
  return filled;
}

export function coarsenDashboardSeries(
  days: DashboardDay[],
  maxPoints = 42,
): DashboardDay[] {
  if (days.length <= maxPoints) return days.map(withDayRange);
  const chunk = Math.ceil(days.length / maxPoints);
  const buckets: DashboardDay[] = [];
  for (let i = 0; i < days.length; i += chunk) {
    const slice = days.slice(i, i + chunk);
    const last = slice[slice.length - 1];
    const first = withDayRange(slice[0]);
    const end = withDayRange(last);
    buckets.push({
      day: end.day,
      fromDay: first.fromDay,
      toDay: end.toDay,
      collected: roundMoney(
        slice.reduce((sum, point) => sum + point.collected, 0),
      ),
      deliveries: slice.reduce((sum, point) => sum + point.deliveries, 0),
      returns: slice.reduce((sum, point) => sum + point.returns, 0),
    });
  }
  return buckets;
}

export function buildDashboardSeries(rows: InvoiceSlice[]): DashboardDay[] {
  const map = new Map<string, DashboardDay>();
  for (const row of rows) {
    if (!row.created_at) continue;
    const day = dhakaYmd(row.created_at);
    const current = map.get(day) ?? emptyDay(day);
    if (row.invoice_type === "return") {
      current.returns += 1;
    } else if (row.invoice_type === "delivery") {
      current.deliveries += 1;
      current.collected = roundMoney(current.collected + row.collected_amount);
    }
    map.set(day, current);
  }
  const days = [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
  return coarsenDashboardSeries(fillDashboardDays(days));
}

export function buildWaterfall(
  rows: {
    key: string;
    label: string;
    amount: number;
    role: string;
  }[],
): WaterfallBar[] {
  const bars: WaterfallBar[] = [];
  let run = 0;
  for (const row of rows) {
    if (row.role !== "inflow" && row.role !== "cost" && row.role !== "total") {
      continue;
    }
    if (row.role === "inflow" || row.role === "total") {
      bars.push({
        key: row.key,
        label: row.label,
        amount: row.amount,
        from: 0,
        to: row.amount,
        role: row.role,
      });
      run = row.amount;
      continue;
    }
    bars.push({
      key: row.key,
      label: row.label,
      amount: row.amount,
      from: run,
      to: roundMoney(run + row.amount),
      role: "cost",
    });
    run = roundMoney(run + row.amount);
  }
  return bars;
}

export function buildCostMix(input: {
  product_cost: number;
  pathao_cost: number;
  recipe_delivery: number;
  return_cost: number;
  packaging_cost: number;
  marketing_cost: number;
  logged_expenses: number;
  custom_costs: { label: string; amount: number }[];
  operating_profit: number;
}): MixSlice[] {
  const slices: MixSlice[] = [
    { key: "product", label: "Product", amount: input.product_cost },
    {
      key: "delivery",
      label: "Delivery",
      amount: roundMoney(input.pathao_cost + input.recipe_delivery),
    },
    { key: "return-fee", label: "Return fees", amount: input.return_cost },
    { key: "packaging", label: "Packaging", amount: input.packaging_cost },
    { key: "marketing", label: "Marketing", amount: input.marketing_cost },
    ...input.custom_costs.map((line, index) => ({
      key: `custom-${index}`,
      label: line.label,
      amount: line.amount,
    })),
    { key: "logged-expenses", label: "Expenses", amount: input.logged_expenses },
  ];
  if (input.operating_profit > 0) {
    slices.push({
      key: "profit",
      label: "Profit",
      amount: input.operating_profit,
    });
  }
  return slices.filter((slice) => slice.amount > 0);
}
