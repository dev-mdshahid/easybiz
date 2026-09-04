import { parseMoneyAmount, parseOpeningDate } from "@/lib/opening-balance";
import { todayDhaka } from "@/lib/time";

export type CostRatioParsed =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; ratio: number }
  | { ok: false; message: string };

export type MovementKind = "purchase" | "adjustment";

export function parseCostRatioPercent(raw: string): CostRatioParsed {
  const trimmed = raw.trim().replace(/%/g, "");
  if (trimmed === "") return { ok: true, skipped: true };
  const n = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Enter a cost percent between 0 and 100." };
  }
  if (n < 0 || n > 100) {
    return { ok: false, message: "Cost percent must be between 0 and 100." };
  }
  const ratio = Math.round(n * 10) / 1000;
  return { ok: true, skipped: false, ratio };
}

export function ratioToPercentInput(ratio: number | null): string {
  if (ratio == null) return "";
  const percent = Math.round(ratio * 1000) / 10;
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
}

export function parseInventoryMovement(
  kindRaw: string,
  amountRaw: string,
  dateRaw: string,
  noteRaw: string,
  today = todayDhaka(),
):
  | {
      ok: true;
      kind: MovementKind;
      amount: number;
      occurredOn: string;
      note: string | null;
    }
  | { ok: false; message: string } {
  const kind = kindRaw.trim();
  if (kind !== "purchase" && kind !== "adjustment") {
    return { ok: false, message: "Choose purchase or adjustment." };
  }

  const amount =
    kind === "purchase"
      ? parseMoneyAmount(amountRaw, {
          emptyMessage: "Enter a purchase amount.",
          zeroMessage: "Purchase amount must be greater than zero.",
        })
      : parseMoneyAmount(amountRaw, {
          allowNegative: true,
          emptyMessage: "Enter an adjustment amount.",
          zeroMessage: "Adjustment cannot be zero.",
        });
  if (!amount.ok) return amount;

  const on = parseOpeningDate(dateRaw, today, "Pick the date of this movement.");
  if (!on.ok) return on;

  const note = noteRaw.trim();
  return {
    ok: true,
    kind,
    amount: amount.value,
    occurredOn: on.value,
    note: note === "" ? null : note,
  };
}
