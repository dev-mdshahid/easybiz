import { describe, expect, it } from "vitest";

import {
  applyStaged,
  profitStatement,
  summarizeDeliveries,
  type CostLineInput,
  validateRecipe,
} from "@/lib/cost-recipe";

const product70: CostLineInput = {
  slot: "product_cost",
  label: "Product cost",
  mode: "percent",
  source: "manual",
  value: 70,
  sort_order: 10,
};

const profit30: CostLineInput = {
  slot: "profit",
  label: "Profit",
  mode: "percent",
  source: "manual",
  value: 30,
  sort_order: 50,
};

const packaging20: CostLineInput = {
  slot: "packaging",
  label: "Packaging",
  mode: "fixed",
  source: "manual",
  value: 20,
  sort_order: 30,
};

const delivery60: CostLineInput = {
  slot: "delivery",
  label: "Delivery",
  mode: "fixed",
  source: "manual",
  value: 60,
  sort_order: 20,
};

const deliveryAuto: CostLineInput = {
  slot: "delivery",
  label: "Delivery",
  mode: "fixed",
  source: "auto",
  value: null,
  sort_order: 20,
};

const marketing10: CostLineInput = {
  slot: "marketing",
  label: "Marketing",
  mode: "percent",
  source: "manual",
  value: 10,
  sort_order: 40,
};

describe("validateRecipe", () => {
  it("rejects product and profit percents over 100 of after costs", () => {
    expect(
      validateRecipe([
        { ...product70, value: 80 },
        { ...profit30, value: 30 },
      ]).ok,
    ).toBe(false);
  });

  it("allows marketing and product percents on different bases", () => {
    expect(validateRecipe([product70, marketing10, profit30]).ok).toBe(true);
  });

  it("allows auto delivery without a manual amount", () => {
    expect(validateRecipe([deliveryAuto, product70]).ok).toBe(true);
  });

  it("rejects auto on a non-delivery line", () => {
    expect(validateRecipe([{ ...packaging20, source: "auto" }]).ok).toBe(false);
  });
});

describe("applyStaged", () => {
  it("follows collected → net payout → after costs → product and profit shares", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 0, orderCount: 1 },
      [deliveryAuto, packaging20, product70, profit30],
    );
    expect(split.netPayout).toBe(920);
    expect(split.packagingCost).toBe(20);
    expect(split.afterCosts).toBe(900);
    expect(split.productCost).toBe(630);
    expect(split.profitAmount).toBe(270);
    expect(split.operatingProfit).toBe(270);
  });

  it("takes return fees out before packaging and product percent", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 135, orderCount: 1 },
      [packaging20, product70, profit30],
    );
    expect(split.netPayout).toBe(785);
    expect(split.afterCosts).toBe(765);
    expect(split.productCost).toBe(535.5);
    expect(split.profitAmount).toBe(229.5);
  });

  it("applies marketing percent to net payout, then product percent to after costs", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 0, orderCount: 1 },
      [marketing10, product70, profit30],
    );
    expect(split.netPayout).toBe(920);
    expect(split.marketingCost).toBe(92);
    expect(split.afterCosts).toBe(828);
    expect(split.productCost).toBe(579.6);
    expect(split.profitAmount).toBe(248.4);
  });

  it("treats leftover as profit when no profit percent is set", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 0, orderCount: 1 },
      [product70],
    );
    expect(split.afterCosts).toBe(920);
    expect(split.productCost).toBe(644);
    expect(split.hasProfitLine).toBe(false);
    expect(split.leftover).toBe(276);
    expect(split.operatingProfit).toBe(276);
  });

  it("scales fixed packaging by order count", () => {
    const split = applyStaged(
      { collected: 2000, deliveryCharge: 160, returnFees: 0, orderCount: 2 },
      [packaging20, product70, profit30],
    );
    expect(split.packagingCost).toBe(40);
    expect(split.afterCosts).toBe(1800);
    expect(split.productCost).toBe(1260);
    expect(split.profitAmount).toBe(540);
  });

  it("adds manual extra delivery after Pathao net payout", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 0, orderCount: 1 },
      [delivery60, product70, profit30],
    );
    expect(split.deliveryCharge).toBe(80);
    expect(split.extraDelivery).toBe(60);
    expect(split.afterCosts).toBe(860);
    expect(split.productCost).toBe(602);
    expect(split.profitAmount).toBe(258);
  });
});

describe("summarizeDeliveries", () => {
  it("uses Pathao fees as the delivery charge, not a second recipe delivery", () => {
    const totals = summarizeDeliveries(
      [
        { collected: 1000, pathaoFee: 80 },
        { collected: 1000, pathaoFee: 80 },
      ],
      [deliveryAuto, product70, profit30],
    );
    expect(totals.deliveryCharge).toBe(160);
    expect(totals.netPayout).toBe(1840);
    expect(totals.productCost).toBe(1288);
    expect(totals.profitAmount).toBe(552);
  });
});

describe("profitStatement", () => {
  it("shows net payout before costs, then product and profit shares", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 135, orderCount: 1 },
      [packaging20, product70, profit30],
    );
    const rows = profitStatement(split);
    expect(rows.find((row) => row.key === "net-payout")?.amount).toBe(785);
    expect(rows.find((row) => row.key === "after-costs")?.amount).toBe(765);
    expect(rows.find((row) => row.key === "product")?.amount).toBe(-535.5);
    expect(rows.find((row) => row.key === "profit")?.amount).toBe(229.5);
  });

  it("subtracts logged expenses after recipe profit without changing shares", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 0, orderCount: 1 },
      [packaging20, product70, profit30],
    );
    expect(split.productCost).toBe(630);
    expect(split.profitAmount).toBe(270);
    const rows = profitStatement(split, 50);
    expect(rows.find((row) => row.key === "product")?.amount).toBe(-630);
    expect(rows.find((row) => row.key === "recipe-profit")?.amount).toBe(270);
    expect(rows.find((row) => row.key === "logged-expenses")?.amount).toBe(-50);
    expect(rows.find((row) => row.key === "profit")?.amount).toBe(220);
  });

  it("leaves the statement unchanged when logged expenses are zero", () => {
    const split = applyStaged(
      { collected: 1000, deliveryCharge: 80, returnFees: 0, orderCount: 1 },
      [product70, profit30],
    );
    const rows = profitStatement(split, 0);
    expect(rows.find((row) => row.key === "recipe-profit")).toBeUndefined();
    expect(rows.find((row) => row.key === "logged-expenses")).toBeUndefined();
    expect(rows.find((row) => row.key === "profit")?.amount).toBe(276);
  });
});
