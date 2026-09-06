import type { LedgerRow } from "@/components/ledger";
import { roundMoney } from "@/lib/cost-recipe";
import { formatBdt } from "@/lib/money";

export type CashLedgerInput = {
  opening_balance: number | null;
  payouts_since_opening: number;
  loan_proceeds: number;
  stock_purchases: number;
  expenses: number;
  loan_repayments: number;
  cash_on_hand: number | null;
};

export type StockLedgerInput = {
  opening_stock: number | null;
  purchases_since_opening: number;
  adjustments_since_opening: number;
  cogs_since_opening: number;
  stock_on_hand: number | null;
  has_product_cost: boolean;
};

export type LoanLedgerInput = {
  id: number;
  lender: string;
  principal: number;
  repaid: number;
  remaining: number;
};

export const PROFIT_FORMULA =
  "Collected − delivery − return fees − recipe costs − logged expenses";
export const ON_HAND_FORMULA = "Cash + stock − unpaid loans";
export const CASH_FORMULA =
  "Opening + Pathao + loans in − stock bought − expenses − repaid";
export const STOCK_FORMULA = "Opening + purchases ± adjustments − COGS";
export const OWE_FORMULA = "Principal still unpaid on each loan";

export function cashRows(cash: CashLedgerInput, countedOn: string): LedgerRow[] {
  const rows: LedgerRow[] = [
    {
      key: "opening",
      label: `Opening · ${countedOn}`,
      amount: cash.opening_balance ?? 0,
      signed: false,
    },
  ];
  const moving: LedgerRow[] = [
    {
      key: "pathao",
      label: "Pathao",
      amount: cash.payouts_since_opening,
      role: "inflow",
      hint: "Lands two days after the consignment date.",
    },
    {
      key: "loans",
      label: "Loans in",
      amount: cash.loan_proceeds,
      role: "inflow",
    },
    {
      key: "stock",
      label: "Stock bought",
      amount: -cash.stock_purchases,
      role: "cost",
    },
    {
      key: "expenses",
      label: "Expenses",
      amount: -cash.expenses,
      role: "cost",
    },
    {
      key: "repaid",
      label: "Repaid",
      amount: -cash.loan_repayments,
      role: "cost",
    },
  ];
  rows.push(...moving.filter((row) => row.amount !== 0));
  rows.push({
    key: "total",
    label: "Cash on hand",
    amount: cash.cash_on_hand ?? 0,
    role: "total",
  });
  return rows;
}

export function stockRows(
  stock: StockLedgerInput,
  countedOn: string,
): LedgerRow[] {
  const rows: LedgerRow[] = [
    {
      key: "opening",
      label: `Opening · ${countedOn}`,
      amount: stock.opening_stock ?? 0,
      signed: false,
    },
  ];
  if (stock.purchases_since_opening !== 0) {
    rows.push({
      key: "purchases",
      label: "Purchases",
      amount: stock.purchases_since_opening,
      role: "inflow",
    });
  }
  if (stock.adjustments_since_opening !== 0) {
    rows.push({
      key: "adjustments",
      label: "Adjustments",
      amount: stock.adjustments_since_opening,
      role: stock.adjustments_since_opening >= 0 ? "inflow" : "cost",
    });
  }
  if (stock.cogs_since_opening !== 0 || !stock.has_product_cost) {
    rows.push({
      key: "cogs",
      label: "COGS",
      amount: -stock.cogs_since_opening,
      role: "cost",
      hint: stock.has_product_cost
        ? "Product cost from the default item recipe. Returns are not added back."
        : "Set product cost in Settings so deliveries reduce stock. Returns are not added back.",
    });
  }
  rows.push({
    key: "total",
    label: "Stock on hand",
    amount: stock.stock_on_hand ?? 0,
    role: "total",
  });
  return rows;
}

export function onHandRows(
  cash: number,
  stock: number,
  owe: number,
): LedgerRow[] {
  return [
    {
      key: "cash",
      label: "Cash on hand",
      amount: cash,
      signed: false,
    },
    {
      key: "stock",
      label: "Stock on hand",
      amount: stock,
      signed: false,
    },
    {
      key: "owe",
      label: "You owe",
      amount: -owe,
      role: "cost",
    },
    {
      key: "total",
      label: "On hand",
      amount: roundMoney(cash + stock - owe),
      role: "total",
    },
  ];
}

export function loanRows(
  loans: LoanLedgerInput[] | null | undefined,
  outstanding: number,
): LedgerRow[] {
  const rows: LedgerRow[] = (loans ?? [])
    .filter((loan) => loan.remaining !== 0)
    .map((loan) => ({
      key: `loan-${loan.id}`,
      label: loan.lender,
      amount: loan.remaining,
      signed: false,
      hint: `${formatBdt(loan.principal)} − ${formatBdt(loan.repaid)}`,
    }));
  rows.push({
    key: "total",
    label: "You owe",
    amount: outstanding,
    role: "total",
  });
  return rows;
}
