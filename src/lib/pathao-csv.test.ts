import { describe, expect, it } from "vitest";

import { parsePathaoCsv } from "@/lib/pathao-csv";

const HEADER =
  "Consignment_ID,Created_Date,Invoice type,Collected_Amount,Recipient_Name,Recipient_Phone,Collectable_Amount,COD_fee,Delivery_Fee,Final_Fee,Discount,Additional_Charge,Compensation_Cost,Promo_Discount,Payout,Merchant_Order_ID,Store_name";

describe("parsePathaoCsv", () => {
  it("parses delivery, return, quoted phones, and negative payout", () => {
    const csv = [
      HEADER,
      'DS1,2026-08-31 09:37:25,delivery,410.00,Aisha,"""01980000000""",410.00,4.10,60.00,49.10,15.00,0.00,0.00,0.00,360.90,DR-0001,Shazelle',
      "RS1,2026-08-31 13:47:46,return,0.00,Shop,01520000000,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,DR-0002,Reverse Logistics @ Pathao",
      "DS2,2026-08-31 04:41:03,delivery,100.00,Nila,01400000000,630.00,1.00,110.00,101.00,10.00,0.00,0.00,0.00,-1.00,DR-0003,Shazelle",
    ].join("\n");

    const result = parsePathaoCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].recipient_phone).toBe("01980000000");
    expect(result.rows[0].invoice_type).toBe("delivery");
    expect(result.rows[0].created_at).toBe("2026-08-31T09:37:25+06:00");
    expect(result.rows[0].payout).toBe(360.9);
    expect(result.rows[1].invoice_type).toBe("return");
    expect(result.rows[2].payout).toBe(-1);
    expect(result.rows[2].collectable_amount).toBe(630);
    expect(result.preview).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects the wrong export", () => {
    const result = parsePathaoCsv("Order,Amount\n1,10");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/Missing columns/);
  });

  it("rejects an empty file", () => {
    const result = parsePathaoCsv("   ");
    expect(result.ok).toBe(false);
  });

  it("keeps valid rows when one row is bad", () => {
    const csv = [
      HEADER,
      "DS1,2026-08-31 09:37:25,delivery,410.00,Aisha,0198,410.00,4.10,60.00,49.10,15.00,0.00,0.00,0.00,360.90,DR-0001,Shazelle",
      "DS2,not-a-date,delivery,100.00,Nila,0140,100.00,1.00,10.00,11.00,0.00,0.00,0.00,0.00,89.00,DR-0003,Shazelle",
    ].join("\n");

    const result = parsePathaoCsv(csv);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
  });

  it("flags duplicate consignment ids in the same file", () => {
    const row =
      "DS1,2026-08-31 09:37:25,delivery,410.00,Aisha,0198,410.00,4.10,60.00,49.10,15.00,0.00,0.00,0.00,360.90,DR-0001,Shazelle";
    const result = parsePathaoCsv([HEADER, row, row].join("\n"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/duplicate consignment/);
  });
});
