import { describe, expect, it } from "vitest";

import {
  addDhakaDays,
  calendarDateToYmd,
  dashboardRangeBounds,
  dashboardRangeHref,
  dashboardRangeLabel,
  parseDashboardRange,
  parseYmd,
  ymdToCalendarDate,
} from "@/lib/dashboard-range";

const TODAY = "2026-09-07";

describe("parseYmd", () => {
  it("accepts a real civil date", () => {
    expect(parseYmd("2026-09-07")).toBe("2026-09-07");
  });

  it("rejects impossible dates", () => {
    expect(parseYmd("2026-02-31")).toBeNull();
    expect(parseYmd("not-a-date")).toBeNull();
  });
});

describe("addDhakaDays", () => {
  it("subtracts calendar days across months", () => {
    expect(addDhakaDays("2026-09-07", -29)).toBe("2026-08-09");
  });
});

describe("parseDashboardRange", () => {
  it("defaults to this month", () => {
    expect(parseDashboardRange({}, TODAY)).toEqual({ kind: "month" });
  });

  it("reads all-time and last-N from the URL", () => {
    expect(parseDashboardRange({ range: "all" }, TODAY)).toEqual({
      kind: "all",
    });
    expect(parseDashboardRange({ days: "12" }, TODAY)).toEqual({
      kind: "last",
      days: 12,
    });
    expect(parseDashboardRange({ preset: "30d" }, TODAY)).toEqual({
      kind: "last",
      days: 30,
    });
  });

  it("rejects invalid last-N values", () => {
    expect(parseDashboardRange({ days: "0" }, TODAY)).toEqual({ kind: "month" });
    expect(parseDashboardRange({ days: "12.5" }, TODAY)).toEqual({
      kind: "month",
    });
    expect(parseDashboardRange({ days: "2000" }, TODAY)).toEqual({
      kind: "month",
    });
  });

  it("swaps and clamps custom dates", () => {
    expect(
      parseDashboardRange({ from: "2026-09-10", to: "2026-08-01" }, TODAY),
    ).toEqual({ kind: "custom", from: "2026-08-01", to: TODAY });
  });

  it("fails closed when custom is missing from", () => {
    expect(parseDashboardRange({ to: "2026-09-01" }, TODAY)).toEqual({
      kind: "month",
    });
  });
});

describe("dashboardRangeBounds", () => {
  it("opens this month from the 1st through now", () => {
    expect(dashboardRangeBounds({ kind: "month" }, TODAY)).toEqual({
      from: "2026-09-01T00:00:00+06:00",
      to: null,
    });
  });

  it("counts last N days including today", () => {
    expect(
      dashboardRangeBounds({ kind: "last", days: 30 }, TODAY),
    ).toEqual({
      from: "2026-08-09T00:00:00+06:00",
      to: null,
    });
    expect(dashboardRangeBounds({ kind: "last", days: 1 }, TODAY)).toEqual({
      from: "2026-09-07T00:00:00+06:00",
      to: null,
    });
  });

  it("uses an exclusive end for custom ranges", () => {
    expect(
      dashboardRangeBounds(
        { kind: "custom", from: "2026-08-01", to: "2026-09-07" },
        TODAY,
      ),
    ).toEqual({
      from: "2026-08-01T00:00:00+06:00",
      to: "2026-09-08T00:00:00+06:00",
    });
  });
});

describe("dashboardRangeHref and label", () => {
  it("keeps this month as a clean URL", () => {
    expect(dashboardRangeHref({ kind: "month" })).toBe("/");
    expect(dashboardRangeLabel({ kind: "month" })).toBe("This month");
  });

  it("serializes last-N and custom ranges", () => {
    expect(dashboardRangeHref({ kind: "last", days: 12 })).toBe("/?days=12");
    expect(dashboardRangeLabel({ kind: "last", days: 12 })).toBe(
      "Last 12 days",
    );
    expect(
      dashboardRangeHref({
        kind: "custom",
        from: "2026-08-01",
        to: "2026-09-07",
      }),
    ).toBe("/?from=2026-08-01&to=2026-09-07");
  });
});

describe("calendar civil dates", () => {
  it("round-trips YMD through UTC noon", () => {
    const date = ymdToCalendarDate("2026-09-07");
    expect(calendarDateToYmd(date)).toBe("2026-09-07");
  });
});
