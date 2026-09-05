import { describe, expect, it } from "vitest";

import { parseAiOrdersPayload } from "@/lib/ai-client";
import {
  clampScreenshotBatchSize,
  collapseExtractedOrders,
  isValidBdMobile,
  matchDraftToQueuePrior,
  merchantOrderId,
  normalizeExpectedOrder,
  normalizePhone,
  overlayPriorWithDraft,
  parseAmount,
  planScreenshotBatches,
  screenshotBatchOverlap,
  statusAfterEdit,
  type ExtractedOrderFragment,
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
    expect(row.recipient_address).toBe("House 1, Road 1, Sector 6, Uttara, Dhaka");
    expect(row.recipient_city).toBe("Dhaka");
    expect(row.recipient_zone).toBe("Uttara");
  });

  it("keeps the row in review when the customer never named a city", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        recipient_address: "H-1, R-1, S-6, Uttara",
        amount_to_collect: 500,
      },
      defaults,
    );
    expect(row.status).toBe("needs_review");
    expect(row.issues.some((i) => /city/i.test(i))).toBe(true);
    expect(row.recipient_address).toBe("House 1, Road 1, Sector 6, Uttara");
    expect(row.recipient_city).toBe("");
  });

  it("is ready when the city is already in the address, without inferring a zone", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        recipient_address: "Hazipara, Thakurgaon",
        amount_to_collect: 500,
      },
      defaults,
    );
    expect(row.status).toBe("ready");
    expect(row.recipient_city).toBe("Thakurgaon");
    expect(row.recipient_zone).toBe("");
    expect(row.recipient_address).toBe("Hazipara, Thakurgaon");
  });

  it("keeps Sylhet when it is already the last part of the address", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Farzana Islam Prity",
        recipient_phone: "01323595505",
        recipient_address: "North Jahanpur, Mitali Store, Majortila, Sylhet",
        amount_to_collect: 550,
      },
      defaults,
    );
    expect(row.status).toBe("ready");
    expect(row.recipient_city).toBe("Sylhet");
    expect(row.recipient_address).toBe("North Jahanpur, Mitali Store, Majortila, Sylhet");
  });

  it("restores a city that was written but dropped from the tidy address", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Farzana Islam Prity",
        recipient_phone: "01323595505",
        recipient_address: "North Jahanpur, Mitali Store, Majortila",
        recipient_address_raw: "uttor jahanpur, mitali stor, majortila, Sylhet",
        amount_to_collect: 550,
      },
      defaults,
    );
    expect(row.recipient_city).toBe("Sylhet");
    expect(row.recipient_address).toMatch(/Sylhet/i);
    expect(row.status).toBe("ready");
  });

  it("does not infer Chittagong from Chawkbazar Thana", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Tamanna",
        recipient_phone: "01701645752",
        recipient_address: "Inside Women Madrasah, Chawkbazar Thana, Chattogram",
        recipient_address_raw:
          "nam Tamanna address mohila madrasah bhitore thana Chawkbazar",
        amount_to_collect: 550,
      },
      defaults,
    );
    expect(row.recipient_city).toBe("");
    expect(row.recipient_address).not.toMatch(/Chittagong|Chattogram/i);
    expect(row.status).toBe("needs_review");
  });

  it("attaches a manually typed city to the address", () => {
    const row = normalizeExpectedOrder(
      {
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        recipient_address: "House 1, Sector 24, Uttara",
        recipient_city: "dhaka",
        amount_to_collect: 500,
      },
      defaults,
    );
    expect(row.status).toBe("ready");
    expect(row.recipient_city).toBe("Dhaka");
    expect(row.recipient_address).toBe("House 1, Sector 24, Uttara, Dhaka");
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

  it("needs review when the COD price is missing", () => {
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
    expect(row.status).toBe("needs_review");
    expect(row.issues.some((i) => /price|amount/i.test(i))).toBe(true);
    expect(row.product_id).toBe(9);
    expect(row.recipient_city).toBe("");
  });
});

describe("statusAfterEdit", () => {
  it("keeps exported when the row stays valid", () => {
    expect(statusAfterEdit("ready", "exported")).toBe("exported");
    expect(statusAfterEdit("needs_review", "exported")).toBe("needs_review");
  });

  it("keeps created rows created and lets failed rows become ready", () => {
    expect(statusAfterEdit("ready", "created")).toBe("created");
    expect(statusAfterEdit("ready", "failed")).toBe("ready");
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

function fragment(
  override: Partial<ExtractedOrderFragment>,
): ExtractedOrderFragment {
  return {
    recipient_name: null,
    recipient_phone: null,
    recipient_address: null,
    recipient_address_as_written: null,
    amount_to_collect: null,
    item_quantity: null,
    item_weight: null,
    item_desc: null,
    special_instruction: null,
    item_type: null,
    warnings: [],
    source_image_indexes: [],
    ...override,
  };
}

describe("collapseExtractedOrders", () => {
  it("merges split fragments that share a phone and one missing COD", () => {
    const collapsed = collapseExtractedOrders([
      fragment({
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        source_image_indexes: [4],
      }),
      fragment({
        recipient_phone: "01710000000",
        recipient_address: "Hazipara, Thakurgaon",
        recipient_address_as_written: "Hazipara, Thakurgaon",
        amount_to_collect: 500,
        source_image_indexes: [5],
      }),
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].recipient_name).toBe("Rahim");
    expect(collapsed[0].recipient_address).toBe("Hazipara, Thakurgaon");
    expect(collapsed[0].amount_to_collect).toBe(500);
    expect(collapsed[0].source_image_indexes).toEqual([4, 5]);
    expect(collapsed[0].warnings).toContain("Combined fields from multiple screenshots.");
  });

  it("keeps two orders when the same phone has different COD amounts", () => {
    const collapsed = collapseExtractedOrders([
      fragment({
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        amount_to_collect: 500,
        source_image_indexes: [1],
      }),
      fragment({
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        amount_to_collect: 900,
        item_desc: "Serum",
        source_image_indexes: [2],
      }),
    ]);
    expect(collapsed).toHaveLength(2);
    expect(collapsed.map((row) => row.amount_to_collect)).toEqual([500, 900]);
  });

  it("collapses overlapping duplicates with the same phone and COD", () => {
    const collapsed = collapseExtractedOrders([
      fragment({
        recipient_name: "Karim",
        recipient_phone: "01820000000",
        amount_to_collect: 1200,
        recipient_address: "House 1, Uttara",
        source_image_indexes: [1, 2],
      }),
      fragment({
        recipient_phone: "01820000000",
        amount_to_collect: 1200,
        item_desc: "Cream",
        source_image_indexes: [2],
      }),
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].item_desc).toBe("Cream");
    expect(collapsed[0].source_image_indexes).toEqual([1, 2]);
  });

  it("does not merge phoneless fragments and warns when they look related", () => {
    const collapsed = collapseExtractedOrders([
      fragment({
        recipient_name: "Farzana",
        recipient_address: "North Jahanpur",
        source_image_indexes: [1],
      }),
      fragment({
        recipient_name: "Farzana Islam",
        amount_to_collect: 550,
        source_image_indexes: [1, 2],
      }),
    ]);
    expect(collapsed).toHaveLength(2);
    expect(collapsed[0].warnings).toContain(
      "This may be part of the same order as another screenshot. Review before sending.",
    );
    expect(collapsed[1].warnings).toContain(
      "This may be part of the same order as another screenshot. Review before sending.",
    );
  });
});

describe("parseAiOrdersPayload", () => {
  it("round-trips source_image_indexes through toAiOrder", () => {
    const orders = parseAiOrdersPayload({
      orders: [
        {
          recipient_name: "Rahim",
          recipient_phone: "01710000000",
          recipient_address: "Hazipara",
          recipient_address_as_written: "Hazipara",
          amount_to_collect: 500,
          item_quantity: null,
          item_weight: null,
          item_desc: null,
          special_instruction: null,
          item_type: null,
          warnings: [],
          source_image_indexes: [5, 4, 4, 0],
        },
      ],
    });
    expect(orders[0].source_image_indexes).toEqual([4, 5]);
  });
});

describe("planScreenshotBatches", () => {
  it("keeps a small drop in one batch", () => {
    expect(planScreenshotBatches({ imageCount: 5, batchSize: 16 })).toEqual([
      { start: 0, end: 5, newStart: 0 },
    ]);
  });

  it("overlaps two screenshots on a 20-image drop with size 16", () => {
    expect(screenshotBatchOverlap(16)).toBe(2);
    expect(planScreenshotBatches({ imageCount: 20, batchSize: 16 })).toEqual([
      { start: 0, end: 16, newStart: 0 },
      { start: 14, end: 20, newStart: 16 },
    ]);
  });

  it("uses no overlap when batch size is 1", () => {
    expect(screenshotBatchOverlap(1)).toBe(0);
    expect(planScreenshotBatches({ imageCount: 3, batchSize: 1 })).toEqual([
      { start: 0, end: 1, newStart: 0 },
      { start: 1, end: 2, newStart: 1 },
      { start: 2, end: 3, newStart: 2 },
    ]);
  });

  it("covers exact multiples and a leftover image after overlap", () => {
    expect(planScreenshotBatches({ imageCount: 32, batchSize: 16 })).toEqual([
      { start: 0, end: 16, newStart: 0 },
      { start: 14, end: 30, newStart: 16 },
      { start: 28, end: 32, newStart: 30 },
    ]);
    expect(planScreenshotBatches({ imageCount: 17, batchSize: 16 })).toEqual([
      { start: 0, end: 16, newStart: 0 },
      { start: 14, end: 17, newStart: 16 },
    ]);
  });

  it("clamps invalid batch sizes", () => {
    expect(clampScreenshotBatchSize(0)).toBe(1);
    expect(clampScreenshotBatchSize(99)).toBe(16);
  });
});

describe("matchDraftToQueuePrior", () => {
  const prior = {
    id: 9,
    recipient_phone: "01710000000",
    amount_to_collect: 0,
    status: "needs_review",
  };

  it("updates a needs-review row when the next batch fills in the price", () => {
    expect(
      matchDraftToQueuePrior(
        { recipient_phone: "01710000000", amount_to_collect: 500 },
        [prior],
        new Set(),
      ),
    ).toEqual({ action: "update", priorId: 9 });
  });

  it("inserts a second order when the same phone has a different COD", () => {
    expect(
      matchDraftToQueuePrior(
        { recipient_phone: "01710000000", amount_to_collect: 900 },
        [{ ...prior, amount_to_collect: 500, status: "ready" }],
        new Set(),
      ),
    ).toEqual({ action: "insert" });
  });

  it("skips a duplicate of an order already created in Pathao", () => {
    expect(
      matchDraftToQueuePrior(
        { recipient_phone: "01710000000", amount_to_collect: 500 },
        [{ ...prior, amount_to_collect: 500, status: "created" }],
        new Set(),
      ),
    ).toEqual({
      action: "skip",
      warning: "Skipped a duplicate of an order already created in Pathao.",
    });
  });
});

describe("overlayPriorWithDraft", () => {
  it("fills an empty address from the later batch", () => {
    const merged = overlayPriorWithDraft(
      {
        recipient_name: "Rahim",
        recipient_phone: "01710000000",
        recipient_address: "",
        recipient_address_raw: "",
        recipient_city: "",
        recipient_zone: "",
        recipient_area: "",
        amount_to_collect: 0,
        item_quantity: 1,
        item_weight: 0.5,
        item_desc: "",
        special_instruction: "",
        item_type: "parcel",
        store_name: "Shazelle",
        warnings: [],
      },
      normalizeExpectedOrder(
        {
          recipient_name: "Rahim",
          recipient_phone: "01710000000",
          recipient_address: "Hazipara, Thakurgaon",
          amount_to_collect: 500,
        },
        { storeName: "Shazelle", itemType: "parcel", itemWeight: 0.5 },
      ),
    );
    expect(merged.recipient_address).toContain("Hazipara");
    expect(merged.amount_to_collect).toBe(500);
  });
});
