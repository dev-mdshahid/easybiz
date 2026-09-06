import { describe, expect, it } from "vitest";

import {
  cashRows,
  loanRows,
  onHandRows,
  stockRows,
} from "@/lib/position-ledgers";

describe("cashRows", () => {
  it("opens with counted-on cash, then non-zero moves, then the total", () => {
    const rows = cashRows(
      {
        opening_balance: 1000,
        payouts_since_opening: 500,
        loan_proceeds: 0,
        stock_purchases: 200,
        expenses: 50,
        loan_repayments: 0,
        cash_on_hand: 1250,
      },
      "31 Aug 2026",
    );
    expect(rows.map((row) => row.key)).toEqual([
      "opening",
      "pathao",
      "stock",
      "expenses",
      "total",
    ]);
    expect(rows.at(-1)).toMatchObject({
      label: "Cash on hand",
      amount: 1250,
      role: "total",
    });
  });
});

describe("stockRows", () => {
  it("adds purchases and COGS onto opening stock", () => {
    const rows = stockRows(
      {
        opening_stock: 10000,
        purchases_since_opening: 3000,
        adjustments_since_opening: 0,
        cogs_since_opening: 1500,
        stock_on_hand: 11500,
        has_product_cost: true,
      },
      "4 Sept 2026",
    );
    expect(rows.map((row) => [row.key, row.amount])).toEqual([
      ["opening", 10000],
      ["purchases", 3000],
      ["cogs", -1500],
      ["total", 11500],
    ]);
  });
});

describe("onHandRows", () => {
  it("is cash plus stock minus unpaid loans", () => {
    const rows = onHandRows(19931, 30903.3, 20000);
    expect(rows.map((row) => [row.key, row.amount])).toEqual([
      ["cash", 19931],
      ["stock", 30903.3],
      ["owe", -20000],
      ["total", 30834.3],
    ]);
  });
});

describe("loanRows", () => {
  it("lists remaining principal and totals unpaid", () => {
    const rows = loanRows(
      [
        {
          id: 1,
          lender: "Amina",
          principal: 20000,
          repaid: 0,
          remaining: 20000,
        },
        {
          id: 2,
          lender: "Karim",
          principal: 5000,
          repaid: 5000,
          remaining: 0,
        },
      ],
      20000,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      label: "Amina",
      amount: 20000,
      hint: "৳20,000.00 − ৳0.00",
    });
    expect(rows[1]).toMatchObject({
      label: "You owe",
      amount: 20000,
      role: "total",
    });
  });
});
