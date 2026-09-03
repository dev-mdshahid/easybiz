import Papa from "papaparse";
import { z } from "zod";

export const MAX_CSV_BYTES = 5 * 1024 * 1024;

export const PATHAO_HEADERS = [
  "Consignment_ID",
  "Created_Date",
  "Invoice type",
  "Collected_Amount",
  "Recipient_Name",
  "Recipient_Phone",
  "Collectable_Amount",
  "COD_fee",
  "Delivery_Fee",
  "Final_Fee",
  "Discount",
  "Additional_Charge",
  "Compensation_Cost",
  "Promo_Discount",
  "Payout",
  "Merchant_Order_ID",
  "Store_name",
] as const;

export type InvoiceType = "delivery" | "return";

export type PathaoInvoiceParsed = {
  consignment_id: string;
  created_at: string;
  invoice_type: InvoiceType;
  collected_amount: number;
  recipient_name: string;
  recipient_phone: string;
  collectable_amount: number;
  cod_fee: number;
  delivery_fee: number;
  final_fee: number;
  discount: number;
  additional_charge: number;
  compensation_cost: number;
  promo_discount: number;
  payout: number;
  merchant_order_id: string;
  store_name: string;
};

export type RowError = {
  row: number;
  message: string;
};

export type ParseSuccess = {
  ok: true;
  rows: PathaoInvoiceParsed[];
  errors: RowError[];
  preview: PathaoInvoiceParsed[];
};

export type ParseFailure = {
  ok: false;
  message: string;
};

export type ParseOutcome = ParseSuccess | ParseFailure;

const money = z
  .string()
  .or(z.number())
  .transform((value, ctx) => {
    const raw = String(value).replace(/,/g, "").trim();
    if (raw === "") {
      ctx.addIssue({ code: "custom", message: "empty amount" });
      return z.NEVER;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "not a number" });
      return z.NEVER;
    }
    return Math.round(n * 100) / 100;
  });

const invoiceType = z.string().transform((value, ctx) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "delivery" || normalized === "return") return normalized;
  ctx.addIssue({
    code: "custom",
    message: `invoice type must be delivery or return, got "${value}"`,
  });
  return z.NEVER;
});

const createdAt = z.string().transform((value, ctx) => {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/,
  );
  if (!match) {
    ctx.addIssue({
      code: "custom",
      message: `unrecognized date "${value}"`,
    });
    return z.NEVER;
  }
  return `${match[1]}T${match[2]}+06:00`;
});

function cleanPhone(value: string): string {
  return value.replace(/"/g, "").trim();
}

const rawRowSchema = z.object({
  Consignment_ID: z.string().trim().min(1, "missing consignment id"),
  Created_Date: createdAt,
  "Invoice type": invoiceType,
  Collected_Amount: money,
  Recipient_Name: z.string().optional().default(""),
  Recipient_Phone: z.string().optional().default(""),
  Collectable_Amount: money,
  COD_fee: money,
  Delivery_Fee: money,
  Final_Fee: money,
  Discount: money,
  Additional_Charge: money,
  Compensation_Cost: money,
  Promo_Discount: money,
  Payout: money,
  Merchant_Order_ID: z.string().optional().default(""),
  Store_name: z.string().optional().default(""),
});

function mapRow(
  raw: z.infer<typeof rawRowSchema>,
): PathaoInvoiceParsed {
  return {
    consignment_id: raw.Consignment_ID.trim(),
    created_at: raw.Created_Date,
    invoice_type: raw["Invoice type"],
    collected_amount: raw.Collected_Amount,
    recipient_name: (raw.Recipient_Name ?? "").trim(),
    recipient_phone: cleanPhone(raw.Recipient_Phone ?? ""),
    collectable_amount: raw.Collectable_Amount,
    cod_fee: raw.COD_fee,
    delivery_fee: raw.Delivery_Fee,
    final_fee: raw.Final_Fee,
    discount: raw.Discount,
    additional_charge: raw.Additional_Charge,
    compensation_cost: raw.Compensation_Cost,
    promo_discount: raw.Promo_Discount,
    payout: raw.Payout,
    merchant_order_id: (raw.Merchant_Order_ID ?? "").trim(),
    store_name: (raw.Store_name ?? "").trim(),
  };
}

export function parsePathaoCsv(text: string): ParseOutcome {
  const stripped = text.replace(/^\uFEFF/, "");
  if (stripped.trim() === "") {
    return { ok: false, message: "This file is empty." };
  }

  const parsed = Papa.parse<Record<string, string>>(stripped, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
  });

  const headers = (parsed.meta.fields ?? []).filter(Boolean);
  if (headers.length === 0) {
    return {
      ok: false,
      message: "No header row found. Export a Pathao paid-invoice CSV.",
    };
  }

  const missing = PATHAO_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      ok: false,
      message: `This does not look like a Pathao paid-invoice CSV. Missing columns: ${missing.join(", ")}`,
    };
  }

  const dataRows = parsed.data.filter((row) =>
    Object.values(row).some((cell) => String(cell ?? "").trim() !== ""),
  );

  if (dataRows.length === 0) {
    return { ok: false, message: "The CSV has headers but no invoice rows." };
  }

  const rows: PathaoInvoiceParsed[] = [];
  const errors: RowError[] = [];
  const seen = new Set<string>();

  dataRows.forEach((row, index) => {
    const line = index + 2;
    const result = rawRowSchema.safeParse(row);
    if (!result.success) {
      const first = result.error.issues[0];
      errors.push({
        row: line,
        message: first?.message ?? "invalid row",
      });
      return;
    }

    const mapped = mapRow(result.data);
    if (seen.has(mapped.consignment_id)) {
      errors.push({
        row: line,
        message: `duplicate consignment ${mapped.consignment_id} in this file`,
      });
      return;
    }
    seen.add(mapped.consignment_id);
    rows.push(mapped);
  });

  if (rows.length === 0) {
    return {
      ok: false,
      message: `No valid rows. ${errors[0]?.message ?? "Check the file and try again."}`,
    };
  }

  return {
    ok: true,
    rows,
    errors,
    preview: rows.slice(0, 10),
  };
}

export function assertCsvSize(bytes: number): string | null {
  if (bytes === 0) return "This file is empty.";
  if (bytes > MAX_CSV_BYTES) return "CSV is larger than 5 MB.";
  return null;
}
