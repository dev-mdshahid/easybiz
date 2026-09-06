import { describe, expect, it } from "vitest";

import {
  parseLiability,
  parseRepayment,
  remainingPrincipal,
  uniqueLenders,
} from "@/lib/liability";

describe("remainingPrincipal", () => {
  it("rounds leftover to cents and floors at zero", () => {
    expect(remainingPrincipal(1000, 250.5)).toBe(749.5);
    expect(remainingPrincipal(10, 10)).toBe(0);
    expect(remainingPrincipal(10, 10.01)).toBe(0);
  });
});

describe("uniqueLenders", () => {
  it("trims, de-dupes case-insensitively, and sorts", () => {
    expect(uniqueLenders([" Karim ", "karim", "Asha", "", "  "])).toEqual([
      "Asha",
      "Karim",
    ]);
  });
});

describe("parseLiability", () => {
  const today = "2026-09-06";

  it("parses a valid loan", () => {
    expect(
      parseLiability(" Karim ", "50,000", "2026-09-02", "Shop", { today }),
    ).toEqual({
      ok: true,
      lender: "Karim",
      amount: 50000,
      borrowedOn: "2026-09-02",
      note: "Shop",
    });
  });

  it("stores a blank note as null", () => {
    const parsed = parseLiability("Karim", "100", "2026-09-06", "  ", { today });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.note).toBeNull();
  });

  it("rejects a blank lender and oversized name", () => {
    expect(parseLiability("  ", "100", "2026-09-06", "", { today }).ok).toBe(false);
    expect(
      parseLiability("x".repeat(81), "100", "2026-09-06", "", { today }).ok,
    ).toBe(false);
  });

  it("rejects zero, negative, and principal below already repaid", () => {
    expect(parseLiability("Karim", "0", "2026-09-06", "", { today }).ok).toBe(false);
    expect(parseLiability("Karim", "-10", "2026-09-06", "", { today }).ok).toBe(
      false,
    );
    expect(
      parseLiability("Karim", "50", "2026-09-06", "", {
        today,
        minPrincipal: 80,
      }).ok,
    ).toBe(false);
  });

  it("rejects a future date", () => {
    expect(
      parseLiability("Karim", "100", "2026-09-07", "", { today }).ok,
    ).toBe(false);
  });
});

describe("parseRepayment", () => {
  const today = "2026-09-06";
  const borrowedOn = "2026-09-02";

  it("parses a partial repayment", () => {
    expect(
      parseRepayment("10,000", "2026-09-04", "First", {
        remaining: 50000,
        borrowedOn,
        today,
      }),
    ).toEqual({
      ok: true,
      amount: 10000,
      repaidOn: "2026-09-04",
      note: "First",
    });
  });

  it("rejects more than remaining, zero, and dates before the loan", () => {
    expect(
      parseRepayment("60", "2026-09-04", "", {
        remaining: 50,
        borrowedOn,
        today,
      }).ok,
    ).toBe(false);
    expect(
      parseRepayment("0", "2026-09-04", "", {
        remaining: 50,
        borrowedOn,
        today,
      }).ok,
    ).toBe(false);
    expect(
      parseRepayment("10", "2026-09-01", "", {
        remaining: 50,
        borrowedOn,
        today,
      }).ok,
    ).toBe(false);
  });

  it("rejects a future date and a fully repaid loan", () => {
    expect(
      parseRepayment("10", "2026-09-07", "", {
        remaining: 50,
        borrowedOn,
        today,
      }).ok,
    ).toBe(false);
    expect(
      parseRepayment("10", "2026-09-04", "", {
        remaining: 0,
        borrowedOn,
        today,
      }).ok,
    ).toBe(false);
  });
});
