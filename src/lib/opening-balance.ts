import { todayDhaka } from "@/lib/time";

export type OpeningBalanceParsed =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; amount: number; on: string }
  | { ok: false; message: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseMoneyAmount(
  raw: string,
  options?: {
    allowNegative?: boolean;
    emptyMessage?: string;
    negativeMessage?: string;
    zeroMessage?: string;
  },
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = raw.trim().replace(/,/g, "").replace(/^৳/, "");
  if (trimmed === "") {
    return { ok: false, message: options?.emptyMessage ?? "Enter an opening amount." };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (!options?.allowNegative && n < 0) {
    return {
      ok: false,
      message: options?.negativeMessage ?? "Opening cash cannot be negative.",
    };
  }
  const rounded = Math.round(n * 100) / 100;
  if (options?.zeroMessage && rounded === 0) {
    return { ok: false, message: options.zeroMessage };
  }
  if (Math.abs(rounded) > 9_999_999_999.99) {
    return { ok: false, message: "That amount is too large." };
  }
  return { ok: true, value: rounded };
}

export function parseOpeningDate(
  raw: string,
  today = todayDhaka(),
  emptyMessage = "Pick the date you counted this cash.",
): { ok: true; value: string } | { ok: false; message: string } {
  const on = raw.trim();
  if (!DATE_RE.test(on)) {
    return { ok: false, message: emptyMessage };
  }
  const [y, m, d] = on.split("-").map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  if (
    Number.isNaN(asUtc) ||
    new Date(asUtc).getUTCFullYear() !== y ||
    new Date(asUtc).getUTCMonth() + 1 !== m ||
    new Date(asUtc).getUTCDate() !== d
  ) {
    return { ok: false, message: "Pick a real calendar date." };
  }
  if (on > today) {
    return { ok: false, message: "The as-of date cannot be in the future." };
  }
  return { ok: true, value: on };
}

export function parseOpeningBalanceFields(
  amountRaw: string,
  dateRaw: string,
  options: { allowSkip: boolean; today?: string; kind?: "cash" | "stock" } = {
    allowSkip: false,
  },
): OpeningBalanceParsed {
  const stock = options.kind === "stock";
  const amountEmpty = amountRaw.trim() === "";
  const dateEmpty = dateRaw.trim() === "";

  if (amountEmpty && dateEmpty) {
    if (options.allowSkip) return { ok: true, skipped: true };
    return {
      ok: false,
      message: stock
        ? "Enter an opening stock amount and date."
        : "Enter an opening amount and date.",
    };
  }

  if (amountEmpty || dateEmpty) {
    return {
      ok: false,
      message: amountEmpty
        ? "Enter an opening amount, or leave both fields empty."
        : stock
          ? "Pick the date you counted this stock, or leave both fields empty."
          : "Pick the date you counted this cash, or leave both fields empty.",
    };
  }

  const amount = parseMoneyAmount(amountRaw, {
    negativeMessage: stock
      ? "Opening stock cannot be negative."
      : "Opening cash cannot be negative.",
  });
  if (!amount.ok) return amount;
  const on = parseOpeningDate(
    dateRaw,
    options.today,
    stock
      ? "Pick the date you counted this stock."
      : "Pick the date you counted this cash.",
  );
  if (!on.ok) return on;

  return { ok: true, skipped: false, amount: amount.value, on: on.value };
}
