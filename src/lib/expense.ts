import { parseMoneyAmount, parseOpeningDate } from "@/lib/opening-balance";
import { todayDhaka } from "@/lib/time";

export const EXPENSE_CATEGORIES = [
  "packaging",
  "marketing",
  "rent",
  "salary",
  "transport",
  "utilities",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  packaging: "Packaging",
  marketing: "Marketing",
  rent: "Rent",
  salary: "Salary",
  transport: "Transport",
  utilities: "Utilities",
  other: "Other",
};

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function parseExpense(
  amountRaw: string,
  dateRaw: string,
  categoryRaw: string,
  noteRaw: string,
  today = todayDhaka(),
):
  | {
      ok: true;
      amount: number;
      occurredOn: string;
      category: ExpenseCategory;
      note: string | null;
    }
  | { ok: false; message: string } {
  const category = categoryRaw.trim();
  if (!isExpenseCategory(category)) {
    return { ok: false, message: "Choose a category." };
  }

  const amount = parseMoneyAmount(amountRaw, {
    emptyMessage: "Enter an expense amount.",
    zeroMessage: "Expense amount must be greater than zero.",
    negativeMessage: "Expense amount cannot be negative.",
  });
  if (!amount.ok) return amount;

  const on = parseOpeningDate(dateRaw, today, "Pick the date of this expense.");
  if (!on.ok) return on;

  const note = noteRaw.trim();
  return {
    ok: true,
    amount: amount.value,
    occurredOn: on.value,
    category,
    note: note === "" ? null : note,
  };
}
