import { describe, expect, it } from "vitest";

import { parseExpense } from "@/lib/expense";

describe("parseExpense", () => {
  const today = "2026-09-04";

  it("parses a valid expense", () => {
    expect(
      parseExpense("1,250.50", "2026-09-02", "rent", "Shop", today),
    ).toEqual({
      ok: true,
      amount: 1250.5,
      occurredOn: "2026-09-02",
      category: "rent",
      note: "Shop",
    });
  });

  it("stores a blank note as null", () => {
    const parsed = parseExpense("100", "2026-09-04", "other", "  ", today);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.note).toBeNull();
  });

  it("rejects an unknown category", () => {
    expect(parseExpense("100", "2026-09-04", "ads", "", today).ok).toBe(false);
  });

  it("rejects zero and negative amounts", () => {
    expect(parseExpense("0", "2026-09-04", "other", "", today).ok).toBe(false);
    expect(parseExpense("-10", "2026-09-04", "other", "", today).ok).toBe(false);
  });

  it("rejects a future date", () => {
    expect(parseExpense("100", "2026-09-05", "other", "", today).ok).toBe(false);
  });
});
