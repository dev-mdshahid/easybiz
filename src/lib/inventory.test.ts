import { describe, expect, it } from "vitest";

import { parseCostRatioPercent, parseInventoryMovement } from "@/lib/inventory";

describe("parseCostRatioPercent", () => {
  it("treats empty as unset", () => {
    expect(parseCostRatioPercent("")).toEqual({ ok: true, skipped: true });
    expect(parseCostRatioPercent("  ")).toEqual({ ok: true, skipped: true });
  });

  it("parses a percent into a 0-1 ratio", () => {
    expect(parseCostRatioPercent("70")).toEqual({
      ok: true,
      skipped: false,
      ratio: 0.7,
    });
    expect(parseCostRatioPercent("70%")).toEqual({
      ok: true,
      skipped: false,
      ratio: 0.7,
    });
    expect(parseCostRatioPercent("0")).toEqual({
      ok: true,
      skipped: false,
      ratio: 0,
    });
  });

  it("rejects values outside 0-100", () => {
    expect(parseCostRatioPercent("-1").ok).toBe(false);
    expect(parseCostRatioPercent("101").ok).toBe(false);
    expect(parseCostRatioPercent("abc").ok).toBe(false);
  });
});

describe("parseInventoryMovement", () => {
  const today = "2026-09-04";

  it("parses a purchase", () => {
    expect(
      parseInventoryMovement("purchase", "12,000", "2026-09-02", "Fabric", today),
    ).toEqual({
      ok: true,
      kind: "purchase",
      amount: 12000,
      occurredOn: "2026-09-02",
      note: "Fabric",
    });
  });

  it("rejects a zero or negative purchase", () => {
    expect(
      parseInventoryMovement("purchase", "0", "2026-09-02", "", today).ok,
    ).toBe(false);
    expect(
      parseInventoryMovement("purchase", "-10", "2026-09-02", "", today).ok,
    ).toBe(false);
  });

  it("parses a signed adjustment", () => {
    expect(
      parseInventoryMovement("adjustment", "-500", "2026-09-01", "Damage", today),
    ).toEqual({
      ok: true,
      kind: "adjustment",
      amount: -500,
      occurredOn: "2026-09-01",
      note: "Damage",
    });
  });

  it("rejects a zero adjustment and a future date", () => {
    expect(
      parseInventoryMovement("adjustment", "0", "2026-09-01", "", today).ok,
    ).toBe(false);
    expect(
      parseInventoryMovement("purchase", "10", "2026-09-05", "", today).ok,
    ).toBe(false);
  });
});
