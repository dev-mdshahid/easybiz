import { describe, expect, it } from "vitest";

import {
  buildCostMix,
  buildDashboardSeries,
  buildWaterfall,
  coarsenDashboardSeries,
  fillDashboardDays,
} from "@/lib/dashboard-series";

describe("fillDashboardDays", () => {
  it("inserts empty days between the first and last point", () => {
    const filled = fillDashboardDays([
      { day: "2026-09-01", collected: 100, deliveries: 1, returns: 0 },
      { day: "2026-09-03", collected: 50, deliveries: 1, returns: 0 },
    ]);
    expect(filled.map((point) => point.day)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
    expect(filled[1]).toEqual({
      day: "2026-09-02",
      collected: 0,
      deliveries: 0,
      returns: 0,
    });
  });
});

describe("buildDashboardSeries", () => {
  it("buckets deliveries and returns by Dhaka day", () => {
    const series = buildDashboardSeries([
      {
        collected_amount: 500,
        created_at: "2026-09-01T10:00:00+06:00",
        invoice_type: "delivery",
      },
      {
        collected_amount: 200,
        created_at: "2026-09-01T18:00:00+06:00",
        invoice_type: "delivery",
      },
      {
        collected_amount: 0,
        created_at: "2026-09-01T12:00:00+06:00",
        invoice_type: "return",
      },
      {
        collected_amount: 100,
        created_at: "2026-09-03T09:00:00+06:00",
        invoice_type: "delivery",
      },
    ]);
    expect(series).toEqual([
      { day: "2026-09-01", collected: 700, deliveries: 2, returns: 1 },
      { day: "2026-09-02", collected: 0, deliveries: 0, returns: 0 },
      { day: "2026-09-03", collected: 100, deliveries: 1, returns: 0 },
    ]);
  });
});

describe("coarsenDashboardSeries", () => {
  it("groups long ranges so the chart stays readable", () => {
    const days = Array.from({ length: 6 }, (_, index) => ({
      day: `2026-09-0${index + 1}`,
      collected: 10,
      deliveries: 1,
      returns: 0,
    }));
    const coarse = coarsenDashboardSeries(days, 3);
    expect(coarse).toHaveLength(3);
    expect(coarse[0]).toEqual({
      day: "2026-09-02",
      collected: 20,
      deliveries: 2,
      returns: 0,
    });
  });
});

describe("buildWaterfall", () => {
  it("drops through costs and ends on profit", () => {
    const bars = buildWaterfall([
      { key: "collected", label: "Collected", amount: 100, role: "inflow" },
      { key: "fee", label: "Fee", amount: -20, role: "cost" },
      { key: "payout", label: "Payout", amount: 80, role: "subtotal" },
      { key: "product", label: "Product", amount: -50, role: "cost" },
      { key: "profit", label: "Profit", amount: 30, role: "total" },
    ]);
    expect(bars.map((bar) => [bar.key, bar.from, bar.to])).toEqual([
      ["collected", 0, 100],
      ["fee", 100, 80],
      ["product", 80, 30],
      ["profit", 0, 30],
    ]);
  });
});

describe("buildCostMix", () => {
  it("keeps only positive slices and treats profit as the remainder", () => {
    const mix = buildCostMix({
      product_cost: 50,
      pathao_cost: 10,
      recipe_delivery: 0,
      return_cost: 0,
      packaging_cost: 5,
      marketing_cost: 0,
      logged_expenses: 2,
      custom_costs: [],
      operating_profit: 20,
    });
    expect(mix.map((slice) => slice.key)).toEqual([
      "product",
      "delivery",
      "packaging",
      "logged-expenses",
      "profit",
    ]);
  });
});
