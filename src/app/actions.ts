"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import {
  assertCsvSize,
  parsePathaoCsv,
  type PathaoInvoiceParsed,
  type RowError,
} from "@/lib/pathao-csv";
import { toNumber } from "@/lib/money";
import { getBusinessContext } from "@/app/business-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CsvUpload, PathaoInvoice } from "@/lib/supabase/database.types";

const UPSERT_BATCH = 500;
const PAGE_SIZE = 25;

export type DashboardStats = {
  delivery_count: number;
  return_count: number;
  revenue: number;
  pathao_cost: number;
  return_cost: number;
  profit: number;
  average_collected: number;
};

function emptyStats(): DashboardStats {
  return {
    delivery_count: 0,
    return_count: 0,
    revenue: 0,
    pathao_cost: 0,
    return_cost: 0,
    profit: 0,
    average_collected: 0,
  };
}

function asStats(value: unknown): DashboardStats {
  if (!value || typeof value !== "object") return emptyStats();
  const row = value as Record<string, unknown>;
  return {
    delivery_count: toNumber(row.delivery_count),
    return_count: toNumber(row.return_count),
    revenue: toNumber(row.revenue),
    pathao_cost: toNumber(row.pathao_cost),
    return_cost: toNumber(row.return_cost),
    profit: toNumber(row.profit),
    average_collected: toNumber(row.average_collected),
  };
}

export async function getDashboardStats(from?: string | null, to?: string | null) {
  const { current: business } = await getBusinessContext();
  if (!business) return emptyStats();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_dashboard_stats", {
    p_business_id: business.id,
    p_from: from || undefined,
    p_to: to || undefined,
  });
  if (error) throw new Error(error.message);
  return asStats(data);
}

export async function listUploads(): Promise<CsvUpload[]> {
  const { current: business } = await getBusinessContext();
  if (!business) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("csv_uploads")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type InvoiceListResult = {
  rows: PathaoInvoice[];
  total: number;
  page: number;
  pageSize: number;
};

function sanitizeSearch(q: string): string {
  return q.replace(/[%*,()]/g, "").trim();
}

export async function listInvoices(params: {
  q?: string;
  invoiceType?: "delivery" | "return" | "all";
  from?: string | null;
  to?: string | null;
  page?: number;
}): Promise<InvoiceListResult> {
  const page = Math.max(1, params.page ?? 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;
  const { current: business } = await getBusinessContext();
  if (!business) {
    return { rows: [], total: 0, page, pageSize: PAGE_SIZE };
  }
  const supabase = createAdminClient();

  let query = supabase
    .from("pathao_invoices")
    .select("*", { count: "exact" })
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lt("created_at", params.to);
  if (params.invoiceType && params.invoiceType !== "all") {
    query = query.eq("invoice_type", params.invoiceType);
  }

  const q = sanitizeSearch(params.q ?? "");
  if (q) {
    query = query.or(
      `consignment_id.ilike.%${q}%,merchant_order_id.ilike.%${q}%,recipient_name.ilike.%${q}%,recipient_phone.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export type ImportResult =
  | {
      ok: true;
      filename: string;
      rowCount: number;
      insertedCount: number;
      updatedCount: number;
      errorCount: number;
      errors: { row: number; message: string }[];
    }
  | { ok: false; message: string };

export async function importPathaoCsv(formData: FormData): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Choose a Pathao CSV file." };
  }

  const sizeError = assertCsvSize(file.size);
  if (sizeError) return { ok: false, message: sizeError };

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = buffer.toString("utf8");
  const parsed = parsePathaoCsv(text);
  if (!parsed.ok) return parsed;

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const { current: business } = await getBusinessContext();
  if (!business) {
    return { ok: false, message: "Create a business before uploading." };
  }
  const supabase = createAdminClient();

  const { data: upload, error: uploadError } = await supabase
    .from("csv_uploads")
    .insert({
      business_id: business.id,
      filename: file.name,
      file_sha256: sha256,
      row_count: parsed.rows.length + parsed.errors.length,
      status: "completed",
      error_count: parsed.errors.length,
    })
    .select("id")
    .single();

  if (uploadError || !upload) {
    return {
      ok: false,
      message: uploadError?.message ?? "Could not record this upload.",
    };
  }

  const ids = parsed.rows.map((row) => row.consignment_id);
  const existing = new Set<string>();

  for (let i = 0; i < ids.length; i += UPSERT_BATCH) {
    const batch = ids.slice(i, i + UPSERT_BATCH);
    const { data, error } = await supabase
      .from("pathao_invoices")
      .select("consignment_id")
      .eq("business_id", business.id)
      .in("consignment_id", batch);
    if (error) {
      await supabase
        .from("csv_uploads")
        .update({ status: "failed", error_message: error.message })
        .eq("id", upload.id);
      return { ok: false, message: error.message };
    }
    for (const row of data ?? []) existing.add(row.consignment_id);
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < parsed.rows.length; i += UPSERT_BATCH) {
    const slice = parsed.rows.slice(i, i + UPSERT_BATCH);
    const payload = slice.map((row) => ({
      ...row,
      business_id: business.id,
      upload_id: upload.id,
      imported_at: new Date().toISOString(),
    }));

    for (const row of slice) {
      if (existing.has(row.consignment_id)) updatedCount += 1;
      else insertedCount += 1;
    }

    const { error } = await supabase.from("pathao_invoices").upsert(payload, {
      onConflict: "business_id,consignment_id",
    });

    if (error) {
      await supabase
        .from("csv_uploads")
        .update({ status: "failed", error_message: error.message })
        .eq("id", upload.id);
      return { ok: false, message: error.message };
    }
  }

  await supabase
    .from("csv_uploads")
    .update({
      inserted_count: insertedCount,
      updated_count: updatedCount,
      error_count: parsed.errors.length,
      status: "completed",
    })
    .eq("id", upload.id);

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/upload");

  return {
    ok: true,
    filename: file.name,
    rowCount: parsed.rows.length,
    insertedCount,
    updatedCount,
    errorCount: parsed.errors.length,
    errors: parsed.errors,
  };
}

export async function previewPathaoCsv(formData: FormData): Promise<
  | {
      ok: true;
      preview: PathaoInvoiceParsed[];
      rowCount: number;
      errorCount: number;
      errors: RowError[];
    }
  | { ok: false; message: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, message: "Choose a Pathao CSV file." };
  }
  const sizeError = assertCsvSize(file.size);
  if (sizeError) return { ok: false, message: sizeError };
  const text = Buffer.from(await file.arrayBuffer()).toString("utf8");
  const parsed = parsePathaoCsv(text);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    preview: parsed.preview,
    rowCount: parsed.rows.length,
    errorCount: parsed.errors.length,
    errors: parsed.errors.slice(0, 20),
  };
}
