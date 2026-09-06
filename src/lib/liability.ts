import { parseMoneyAmount, parseOpeningDate } from "@/lib/opening-balance";
import { todayDhaka } from "@/lib/time";

export const LIABILITY_CHANNEL = "cash" as const;

export const LENDER_MAX_LENGTH = 80;

export type LiabilityParsed = {
  ok: true;
  lender: string;
  amount: number;
  borrowedOn: string;
  note: string | null;
};

export type LiabilityParseFail = { ok: false; message: string };

export function remainingPrincipal(principal: number, repaid: number): number {
  const left = Math.round((principal - repaid) * 100) / 100;
  return left < 0 ? 0 : left;
}

export function parseLender(
  raw: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const lender = raw.trim();
  if (lender === "") {
    return { ok: false, message: "Enter who you borrowed from." };
  }
  if (lender.length > LENDER_MAX_LENGTH) {
    return { ok: false, message: "That name is too long." };
  }
  return { ok: true, value: lender };
}

export function uniqueLenders(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of names) {
    const parsed = parseLender(raw);
    if (!parsed.ok) continue;
    const key = parsed.value.toLowerCase();
    if (!seen.has(key)) seen.set(key, parsed.value);
  }
  return [...seen.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

export function parseNote(raw: string): string | null {
  const note = raw.trim();
  return note === "" ? null : note;
}

export function parseLiability(
  lenderRaw: string,
  amountRaw: string,
  dateRaw: string,
  noteRaw: string,
  options?: { today?: string; minPrincipal?: number },
): LiabilityParsed | LiabilityParseFail {
  const lender = parseLender(lenderRaw);
  if (!lender.ok) return lender;

  const amount = parseMoneyAmount(amountRaw, {
    emptyMessage: "Enter the amount borrowed.",
    zeroMessage: "Borrowed amount must be greater than zero.",
    negativeMessage: "Borrowed amount cannot be negative.",
  });
  if (!amount.ok) return amount;

  const minPrincipal = options?.minPrincipal ?? 0;
  if (minPrincipal > 0 && amount.value < minPrincipal) {
    return {
      ok: false,
      message: "Principal cannot be less than already repaid.",
    };
  }

  const on = parseOpeningDate(
    dateRaw,
    options?.today ?? todayDhaka(),
    "Pick the date you received this money.",
  );
  if (!on.ok) return on;

  return {
    ok: true,
    lender: lender.value,
    amount: amount.value,
    borrowedOn: on.value,
    note: parseNote(noteRaw),
  };
}

export function parseRepayment(
  amountRaw: string,
  dateRaw: string,
  noteRaw: string,
  options: {
    remaining: number;
    borrowedOn: string;
    today?: string;
  },
):
  | {
      ok: true;
      amount: number;
      repaidOn: string;
      note: string | null;
    }
  | { ok: false; message: string } {
  const remaining = remainingPrincipal(options.remaining, 0);
  if (remaining <= 0) {
    return { ok: false, message: "This loan is already repaid." };
  }

  const amount = parseMoneyAmount(amountRaw, {
    emptyMessage: "Enter a repayment amount.",
    zeroMessage: "Repayment must be greater than zero.",
    negativeMessage: "Repayment cannot be negative.",
  });
  if (!amount.ok) return amount;

  if (amount.value > remaining) {
    return {
      ok: false,
      message: "Repayment cannot be more than the remaining principal.",
    };
  }

  const on = parseOpeningDate(
    dateRaw,
    options.today ?? todayDhaka(),
    "Pick the date of this repayment.",
  );
  if (!on.ok) return on;

  if (on.value < options.borrowedOn) {
    return {
      ok: false,
      message: "Repayment cannot be before the loan date.",
    };
  }

  return {
    ok: true,
    amount: amount.value,
    repaidOn: on.value,
    note: parseNote(noteRaw),
  };
}
