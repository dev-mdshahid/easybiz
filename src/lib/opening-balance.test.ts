import { describe, expect, it } from "vitest";

import { parseMoneyAmount, parseOpeningBalanceFields, parseOpeningDate } from "@/lib/opening-balance";

describe("parseMoneyAmount", () => {
  it("parses zero, commas, and the taka prefix", () => {
    expect(parseMoneyAmount("0")).toEqual({ ok: true, value: 0 });
    expect(parseMoneyAmount(" 12,500.50 ")).toEqual({ ok: true, value: 12500.5 });
    expect(parseMoneyAmount("৳100")).toEqual({ ok: true, value: 100 });
  });

  it("rejects empty, invalid, and negative values", () => {
    expect(parseMoneyAmount("").ok).toBe(false);
    expect(parseMoneyAmount("abc").ok).toBe(false);
    expect(parseMoneyAmount("-1").ok).toBe(false);
  });
});

describe("parseOpeningDate", () => {
  const today = "2026-09-04";

  it("accepts today and earlier dates", () => {
    expect(parseOpeningDate("2026-09-04", today)).toEqual({
      ok: true,
      value: "2026-09-04",
    });
    expect(parseOpeningDate("2026-01-01", today).ok).toBe(true);
  });

  it("rejects missing, invalid, and future dates", () => {
    expect(parseOpeningDate("", today).ok).toBe(false);
    expect(parseOpeningDate("2026-13-01", today).ok).toBe(false);
    expect(parseOpeningDate("2026-02-31", today).ok).toBe(false);
    expect(parseOpeningDate("2026-09-05", today).ok).toBe(false);
  });
});

describe("parseOpeningBalanceFields", () => {
  const today = "2026-09-04";

  it("treats both empty as skip when allowed", () => {
    expect(
      parseOpeningBalanceFields("", "", { allowSkip: true, today }),
    ).toEqual({ ok: true, skipped: true });
  });

  it("requires both fields when skip is not allowed", () => {
    const result = parseOpeningBalanceFields("", "", { allowSkip: false, today });
    expect(result.ok).toBe(false);
  });

  it("rejects one field filled and the other empty", () => {
    expect(parseOpeningBalanceFields("100", "", { allowSkip: true, today }).ok).toBe(
      false,
    );
    expect(parseOpeningBalanceFields("", "2026-09-04", { allowSkip: true, today }).ok).toBe(
      false,
    );
  });

  it("returns a parsed pair", () => {
    expect(
      parseOpeningBalanceFields("1,000", "2026-08-31", { allowSkip: true, today }),
    ).toEqual({ ok: true, skipped: false, amount: 1000, on: "2026-08-31" });
  });
});
