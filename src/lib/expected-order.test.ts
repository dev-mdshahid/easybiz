import { describe, expect, it } from "vitest";

import {
  isValidBdMobile,
  merchantOrderId,
  normalizeExpectedOrder,
  normalizePhone,
  parseAmount,
  statusAfterEdit,
} from "@/lib/expected-order";
import { matchCity, matchZone, resolveLocation, locationCatalogForPrompt } from "@/lib/pathao-locations";
import { buildPathaoBulkCsv, PATHAO_BULK_HEADERS } from "@/lib/pathao-bulk-csv";

describe("normalizePhone", () => {
  it("normalizes +880, 880, spaces, and Bangla digits", () => {
    expect(normalizePhone("+8801710000000")).toBe("01710000000");
    expect(normalizePhone("8801710000000")).toBe("01710000000");
    expect(normalizePhone("0171 000 0000")).toBe("01710000000");
    expect(normalizePhone("০১৭১০০০০০০০")).toBe("01710000000");
    expect(normalizePhone("1710000000")).toBe("01710000000");
  });

  it("rejects landlines that are not 01x mobiles", () => {
    expect(isValidBdMobile("0212345678")).toBe(false);
    expect(isValidBdMobile("01710000000")).toBe(true);
  });
});

describe("parseAmount", () => {
  it("parses k, Bangla digits, and taka suffixes", () => {
    expect(parseAmount("1k")).toEqual({ value: 1000, explicit: true });
    expect(parseAmount("১২০০")).toEqual({ value: 1200, explicit: true });
    expect(parseAmount("1,200 tk")).toEqual({ value: 1200, explicit: true });
    expect(parseAmount(null)).toEqual({ value: null, explicit: false });
  });
});

describe("locations", () => {
  it("treats Uttara as a Dhaka zone", () => {
    expect(matchCity("Dhaka")).toBe("Dhaka");
    expect(matchZone("Uttara")?.zone).toBe("Uttara");
    expect(matchZone("উত্তরা")?.city).toBe("Dhaka");
    const fromAddress = resolveLocation({
      address: "H-1, R-1, S-6, Uttara",
    });
    expect(fromAddress).toEqual({ city: "Dhaka", zone: "Uttara" });
    expect(matchCity("Thakurgaon")).toBe("Thakurgaon");
    expect(resolveLocation({ city: "Thakurgaon", address: "Hazipara, Thakurgaon" })).toEqual({
      city: "Thakurgaon",
      zone: "Thakurgaon Sadar",
    });
    expect(locationCatalogForPrompt()).toContain("Dhaka:");
    expect(locationCatalogForPrompt()).toMatch(/Uttara/);
  });
});

describe("normalizeExpectedOrder", () => {
  const defaults = {
    storeName: "Shazelle",
    itemType: "parcel" as const,
    itemWeight: 0.5,
  };

  it("marks a complete Pathao row ready", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Mr Xyz",
        recipient_phone: "01710000000",
        recipient_address: "H-1,R-1,S-6, Uttara",
        recipient_city: "Dhaka",
        recipient_zone: "Uttara",
        amount_to_collect: 1000,
      },
      defaults,
    );
    expect(row.status).toBe("ready");
    expect(row.store_name).toBe("Shazelle");
    expect(row.item_weight).toBe(0.5);
    expect(row.item_quantity).toBe(1);
  });

  it("needs review when the phone is invalid", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Mr Xyz",
        recipient_phone: "123",
        recipient_address: "H-1,R-1,S-6, Uttara",
        recipient_city: "Dhaka",
        recipient_zone: "Uttara",
        amount_to_collect: 1000,
      },
      defaults,
    );
    expect(row.status).toBe("needs_review");
    expect(row.issues.some((i) => /phone/i.test(i))).toBe(true);
  });

  it("uses product selling price when COD is missing", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Mr Xyz",
        recipient_phone: "01710000000",
        recipient_address: "H-1,R-1,S-6, Uttara",
        item_desc: "Serum",
      },
      defaults,
      [{ id: 9, name: "Serum", selling_price: 850 }],
    );
    expect(row.amount_to_collect).toBe(850);
    expect(row.product_id).toBe(9);
    expect(row.recipient_city).toBe("Dhaka");
  });
});

describe("statusAfterEdit", () => {
  it("keeps exported when the row stays valid", () => {
    expect(statusAfterEdit("ready", "exported")).toBe("exported");
    expect(statusAfterEdit("needs_review", "exported")).toBe("needs_review");
  });
});

describe("buildPathaoBulkCsv", () => {
  it("matches the Pathao sample header and a filled row", () => {
    const csv = buildPathaoBulkCsv([
      {
        item_type: "parcel",
        store_name: "",
        merchant_order_id: "",
        recipient_name: "Mr Xyz",
        recipient_phone: "01710000000",
        recipient_address: "H-1,R-1,S-6, Uttara",
        recipient_city: "Dhaka",
        recipient_zone: "Uttara",
        recipient_area: "",
        amount_to_collect: 1000,
        item_quantity: 1,
        item_weight: 0.5,
        item_desc: "",
        special_instruction: "",
      },
    ]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(PATHAO_BULK_HEADERS.join(","));
    expect(lines[1]).toContain("Mr Xyz");
    expect(lines[1]).toContain("01710000000");
    expect(lines[1]).toContain("Dhaka");
    expect(lines[1]).toContain("Uttara");
    expect(merchantOrderId(12)).toBe("EB-12");
  });
});
