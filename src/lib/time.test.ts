import { describe, expect, it } from "vitest";

import {
  dhakaExclusiveRange,
  formatDhakaDayRange,
  nextDhakaYmd,
} from "@/lib/time";

describe("nextDhakaYmd", () => {
  it("rolls into the next month", () => {
    expect(nextDhakaYmd("2026-09-30")).toBe("2026-10-01");
  });
});

describe("dhakaExclusiveRange", () => {
  it("covers a single Dhaka day with an exclusive end", () => {
    expect(dhakaExclusiveRange("2026-09-02", "2026-09-02")).toEqual({
      from: "2026-09-02T00:00:00+06:00",
      to: "2026-09-03T00:00:00+06:00",
    });
  });

  it("covers an inclusive bucket", () => {
    expect(dhakaExclusiveRange("2026-08-30", "2026-09-02")).toEqual({
      from: "2026-08-30T00:00:00+06:00",
      to: "2026-09-03T00:00:00+06:00",
    });
  });
});

describe("formatDhakaDayRange", () => {
  it("uses a single short date when the range is one day", () => {
    expect(formatDhakaDayRange("2026-09-02", "2026-09-02")).toBe("2 Sept");
  });

  it("joins bucket ends with an en dash", () => {
    expect(formatDhakaDayRange("2026-08-30", "2026-09-02")).toBe(
      "30 Aug – 2 Sept",
    );
  });
});
