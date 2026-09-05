import { describe, expect, it } from "vitest";

import {
  addressContainsName,
  clampAddressKeepingTail,
  expandAddressAbbreviations,
  formatAddressForPathao,
} from "@/lib/pathao-address";
import {
  buildCreateOrderPayload,
  isEligibleForPathaoCreate,
  tokenNeedsRefresh,
} from "@/lib/pathao-api";

describe("formatAddressForPathao", () => {
  it("expands H/R/S abbreviations without adding a city", () => {
    const result = formatAddressForPathao({
      address: "H-1,R-1,S-6, Uttara",
    });
    expect(result.raw).toBe("H-1, R-1, S-6, Uttara");
    expect(result.formatted).toBe("House 1, Road 1, Sector 6, Uttara");
    expect(result.formatted).not.toMatch(/Dhaka/i);
  });

  it("attaches an explicitly typed city to the address", () => {
    const result = formatAddressForPathao({
      address: "House 1, Sector 24, Uttara",
      city: "Dhaka",
    });
    expect(result.formatted).toBe("House 1, Sector 24, Uttara, Dhaka");
  });

  it("keeps Bangla digits as Latin and does not invent a house number", () => {
    const result = formatAddressForPathao({
      address: "হাজীপাড়া, ঠাকুরগাঁও",
    });
    expect(result.formatted).not.toMatch(/House \d+/);
  });

  it("does not append a district the customer did not write", () => {
    const result = formatAddressForPathao({
      address: "Hazipara, Thakurgaon",
    });
    expect(result.formatted).toBe("Hazipara, Thakurgaon");
  });

  it("clamps to 220 characters while keeping the tail", () => {
    const long = `${"Block A, ".repeat(40)}Uttara, Dhaka`;
    const clamped = clampAddressKeepingTail(long, 220);
    expect(clamped.length).toBeLessThanOrEqual(220);
    expect(clamped.endsWith("Uttara, Dhaka")).toBe(true);
  });

  it("detects an existing locality name", () => {
    expect(addressContainsName("House 1, Uttara, Dhaka", "Dhaka")).toBe(true);
    expect(addressContainsName("House 1, Uttara", "Mirpur")).toBe(false);
  });

  it("expands Block abbreviations", () => {
    expect(expandAddressAbbreviations("Blk-2, Banani")).toBe("Block 2, Banani");
  });
});

describe("buildCreateOrderPayload", () => {
  it("omits recipient city, zone, and area so Pathao auto-address can run", () => {
    const payload = buildCreateOrderPayload({
      store_id: 99,
      merchant_order_id: "EB-12",
      recipient_name: "Mr Xyz",
      recipient_phone: "01710000000",
      recipient_address: "House 1, Road 1, Sector 6, Uttara, Dhaka",
      delivery_type: 48,
      item_type: "parcel",
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: 1000.4,
      item_description: "Serum",
      special_instruction: "Call first",
    });
    expect(payload).toEqual({
      store_id: 99,
      merchant_order_id: "EB-12",
      recipient_name: "Mr Xyz",
      recipient_phone: "01710000000",
      recipient_address: "House 1, Road 1, Sector 6, Uttara, Dhaka",
      delivery_type: 48,
      item_type: 2,
      item_quantity: 1,
      item_weight: 0.5,
      amount_to_collect: 1000,
      item_description: "Serum",
      special_instruction: "Call first",
    });
    expect("recipient_city" in payload).toBe(false);
    expect("recipient_zone" in payload).toBe(false);
    expect("recipient_area" in payload).toBe(false);
  });
});

describe("isEligibleForPathaoCreate", () => {
  it("allows ready, exported, and failed retries", () => {
    expect(isEligibleForPathaoCreate({ status: "ready" })).toBe(true);
    expect(isEligibleForPathaoCreate({ status: "exported" })).toBe(true);
    expect(isEligibleForPathaoCreate({ status: "failed" })).toBe(true);
  });

  it("skips created, needs_review, discarded, and rows with a consignment id", () => {
    expect(isEligibleForPathaoCreate({ status: "created" })).toBe(false);
    expect(isEligibleForPathaoCreate({ status: "needs_review" })).toBe(false);
    expect(isEligibleForPathaoCreate({ status: "discarded" })).toBe(false);
    expect(
      isEligibleForPathaoCreate({
        status: "ready",
        pathao_consignment_id: "DL123",
      }),
    ).toBe(false);
  });
});

describe("tokenNeedsRefresh", () => {
  it("refreshes missing, invalid, and soon-to-expire tokens", () => {
    const now = Date.parse("2026-09-04T12:00:00.000Z");
    expect(tokenNeedsRefresh(null, now)).toBe(true);
    expect(tokenNeedsRefresh("not-a-date", now)).toBe(true);
    expect(tokenNeedsRefresh("2026-09-04T12:00:30.000Z", now)).toBe(true);
    expect(tokenNeedsRefresh("2026-09-04T14:00:00.000Z", now)).toBe(false);
  });
});
