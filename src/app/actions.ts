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
import { applyStaged, profitStatement, roundMoney, summarizeDeliveries, type CostLineInput, type ProfitStatementRow } from "@/lib/cost-recipe";
import { buildDashboardSeries, type DashboardDay } from "@/lib/dashboard-series";
import { dhakaYmd } from "@/lib/time";
import { getBusinessContext } from "@/app/business-actions";
import { sumExpenses } from "@/app/expense-actions";
import { loadDefaultCostLines } from "@/app/settings-actions";
import { createClient } from "@/lib/supabase/server";
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
  operating_profit: number;
  average_collected: number;
  product_cost: number;
  delivery_cost: number;
  packaging_cost: number;
  marketing_cost: number;
  recipe_delivery: number;
  other_cost: number;
  auto_delivery: boolean;
  has_profit_line: boolean;
  profit_line: number;
  leftover: number;
  logged_expenses: number;
  custom_costs: { label: string; amount: number }[];
  statement: ProfitStatementRow[];
  final_payout: number;
  series: DashboardDay[];
};

function emptyStats(): DashboardStats {
  return {
    delivery_count: 0,
    return_count: 0,
    revenue: 0,
    pathao_cost: 0,
    return_cost: 0,
    profit: 0,
    operating_profit: 0,
    average_collected: 0,
    product_cost: 0,
    delivery_cost: 0,
    packaging_cost: 0,
    marketing_cost: 0,
    recipe_delivery: 0,
    other_cost: 0,
    auto_delivery: false,
    has_profit_line: false,
    profit_line: 0,
    leftover: 0,
    logged_expenses: 0,
    custom_costs: [],
    statement: [],
    final_payout: 0,
    series: [],
  };
}

function asStats(value: unknown): DashboardStats {
  if (!value || typeof value !== "object") return emptyStats();
  const row = value as Record<string, unknown>;
  return {
    ...emptyStats(),
    delivery_count: toNumber(row.delivery_count),
    return_count: toNumber(row.return_count),
    revenue: toNumber(row.revenue),
    pathao_cost: toNumber(row.pathao_cost),
    return_cost: toNumber(row.return_cost),
    profit: toNumber(row.profit),
    average_collected: toNumber(row.average_collected),
  };
}

export type CashPosition = {
  is_set: boolean;
  opening_balance: number | null;
  opening_balance_on: string | null;
  payouts_since_opening: number;
  stock_purchases: number;
  expenses: number;
  loan_proceeds: number;
  loan_repayments: number;
  liabilities_outstanding: number;
  cash_on_hand: number | null;
};

function emptyCashPosition(): CashPosition {
  return {
    is_set: false,
    opening_balance: null,
    opening_balance_on: null,
    payouts_since_opening: 0,
    stock_purchases: 0,
    expenses: 0,
    loan_proceeds: 0,
    loan_repayments: 0,
    liabilities_outstanding: 0,
    cash_on_hand: null,
  };
}

function asDateOnly(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.slice(0, 10);
}

function asCashPosition(value: unknown): CashPosition {
  if (!value || typeof value !== "object") return emptyCashPosition();
  const row = value as Record<string, unknown>;
  const isSet = row.is_set === true;
  return {
    is_set: isSet,
    opening_balance: isSet ? toNumber(row.opening_balance) : null,
    opening_balance_on: isSet ? asDateOnly(row.opening_balance_on) : null,
    payouts_since_opening: toNumber(row.payouts_since_opening),
    stock_purchases: toNumber(row.stock_purchases),
    expenses: toNumber(row.expenses),
    loan_proceeds: toNumber(row.loan_proceeds),
    loan_repayments: toNumber(row.loan_repayments),
    liabilities_outstanding: toNumber(row.liabilities_outstanding),
    cash_on_hand: isSet ? toNumber(row.cash_on_hand) : null,
  };
}

export async function getCashPosition(): Promise<CashPosition> {
  const { current: business } = await getBusinessContext();
  if (!business) return emptyCashPosition();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_cash_position", {
    p_business_id: business.id,
  });
  if (error) throw new Error(error.message);
  return asCashPosition(data);
}

export type StockPosition = {
  is_set: boolean;
  opening_stock: number | null;
  opening_stock_on: string | null;
  inventory_cost_ratio: number | null;
  purchases_since_opening: number;
  adjustments_since_opening: number;
  cogs_since_opening: number;
  stock_on_hand: number | null;
  has_product_cost: boolean;
};

function emptyStockPosition(): StockPosition {
  return {
    is_set: false,
    opening_stock: null,
    opening_stock_on: null,
    inventory_cost_ratio: null,
    purchases_since_opening: 0,
    adjustments_since_opening: 0,
    cogs_since_opening: 0,
    stock_on_hand: null,
    has_product_cost: false,
  };
}

function asRatio(value: unknown): number | null {
  if (value == null) return null;
  const n = toNumber(value);
  return Number.isFinite(n) ? n : null;
}

function asStockPosition(value: unknown): StockPosition {
  if (!value || typeof value !== "object") return emptyStockPosition();
  const row = value as Record<string, unknown>;
  const isSet = row.is_set === true;
  const ratio = row.inventory_cost_ratio;
  return {
    is_set: isSet,
    opening_stock: isSet ? toNumber(row.opening_stock) : null,
    opening_stock_on: isSet ? asDateOnly(row.opening_stock_on) : null,
    inventory_cost_ratio:
      ratio == null || ratio === "" ? null : asRatio(ratio),
    purchases_since_opening: toNumber(row.purchases_since_opening),
    adjustments_since_opening: toNumber(row.adjustments_since_opening),
    cogs_since_opening: toNumber(row.cogs_since_opening),
    stock_on_hand: isSet ? toNumber(row.stock_on_hand) : null,
    has_product_cost: false,
  };
}

function withRatioFallback(
  lines: CostLineInput[],
  ratio: number | null,
): CostLineInput[] {
  const hasProduct = lines.some(
    (line) => line.slot === "product_cost" && line.value != null,
  );
  if (hasProduct || ratio == null) return lines;
  const percent = roundMoney(ratio * 100);
  if (lines.some((line) => line.slot === "product_cost")) {
    return lines.map((line) =>
      line.slot === "product_cost"
        ? { ...line, mode: "percent", value: percent }
        : line,
    );
  }
  return [
    ...lines,
    {
      slot: "product_cost",
      label: "Product cost",
      mode: "percent",
      source: "manual",
      value: percent,
      sort_order: 10,
    },
  ];
}

type DeliverySlice = {
  collected_amount: number;
  final_fee: number;
  created_at: string;
  invoice_type: string;
};

async function listPeriodInvoices(
  businessId: number,
  from?: string | null,
  to?: string | null,
  invoiceType?: "delivery",
): Promise<DeliverySlice[]> {
  const supabase = await createClient();
  const pageSize = 1000;
  const rows: DeliverySlice[] = [];
  let offset = 0;
  for (;;) {
    let query = supabase
      .from("pathao_invoices_current")
      .select("collected_amount, final_fee, created_at, invoice_type")
      .eq("business_id", businessId)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (invoiceType) query = query.eq("invoice_type", invoiceType);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    for (const row of batch) {
      if (!row.created_at) continue;
      rows.push({
        collected_amount: toNumber(row.collected_amount),
        final_fee: toNumber(row.final_fee),
        created_at: row.created_at,
        invoice_type: row.invoice_type ?? "delivery",
      });
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

async function listDeliveries(
  businessId: number,
  from?: string | null,
  to?: string | null,
): Promise<DeliverySlice[]> {
  return listPeriodInvoices(businessId, from, to, "delivery");
}

export async function getStockPosition(): Promise<StockPosition> {
  const { current: business } = await getBusinessContext();
  if (!business) return emptyStockPosition();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_stock_position", {
    p_business_id: business.id,
  });
  if (error) throw new Error(error.message);
  const position = asStockPosition(data);
  const recipe = withRatioFallback(
    await loadDefaultCostLines(),
    position.inventory_cost_ratio,
  );
  position.has_product_cost = recipe.some(
    (line) => line.slot === "product_cost" && line.value != null,
  );

  if (!position.is_set || !position.opening_stock_on) {
    return position;
  }

  const deliveries = await listDeliveries(business.id);
  let cogs = 0;
  for (const row of deliveries) {
    if (dhakaYmd(row.created_at) >= position.opening_stock_on) {
      cogs = roundMoney(
        cogs +
          applyStaged(
            {
              collected: row.collected_amount,
              deliveryCharge: row.final_fee,
              returnFees: 0,
              orderCount: 1,
            },
            recipe,
          ).productCost,
      );
    }
  }
  position.cogs_since_opening = cogs;
  position.stock_on_hand = roundMoney(
    toNumber(position.opening_stock) +
      position.purchases_since_opening +
      position.adjustments_since_opening -
      cogs,
  );
  return position;
}

export async function getDashboardStats(from?: string | null, to?: string | null) {
  const { current: business } = await getBusinessContext();
  if (!business) return emptyStats();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_dashboard_stats", {
    p_business_id: business.id,
    p_from: from || undefined,
    p_to: to || undefined,
  });
  if (error) throw new Error(error.message);
  const stats = asStats(data);
  const recipe = withRatioFallback(
    await loadDefaultCostLines(),
    business.inventory_cost_ratio,
  );
  const invoices = await listPeriodInvoices(business.id, from, to);
  const deliveries = invoices.filter((row) => row.invoice_type === "delivery");
  const totals = summarizeDeliveries(
    deliveries.map((row) => ({
      collected: row.collected_amount,
      pathaoFee: row.final_fee,
    })),
    recipe,
    stats.return_cost,
  );
  stats.product_cost = totals.productCost;
  stats.delivery_cost = totals.deliveryCharge;
  stats.packaging_cost = totals.packagingCost;
  stats.marketing_cost = totals.marketingCost;
  stats.recipe_delivery = totals.extraDelivery;
  stats.other_cost = totals.otherCost;
  stats.auto_delivery = totals.autoDelivery;
  stats.has_profit_line = totals.hasProfitLine;
  stats.profit_line = totals.profitAmount;
  stats.leftover = totals.leftover;
  stats.custom_costs = totals.customLines;
  stats.final_payout = totals.netPayout;
  const logged = await sumExpenses(from, to);
  stats.logged_expenses = logged;
  stats.operating_profit = roundMoney(totals.operatingProfit - logged);
  stats.statement = profitStatement(totals, logged);
  stats.series = buildDashboardSeries(invoices);
  return stats;
}

export async function listUploads(): Promise<CsvUpload[]> {
  const { current: business } = await getBusinessContext();
  if (!business) return [];
  const supabase = await createClient();
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
  const supabase = await createClient();

  let query = supabase
    .from("pathao_invoices_current")
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
    rows: (data ?? []) as PathaoInvoice[],
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
  const supabase = await createClient();

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

    const { error } = await supabase.from("pathao_invoices").insert(payload);

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
  revalidatePath("/inventory");

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

export type DeleteUploadResult =
  | {
      ok: true;
      filename: string;
      removedCount: number;
      revertedCount: number;
      keptCount: number;
    }
  | { ok: false; message: string };

function asDeleteResult(value: unknown): DeleteUploadResult {
  if (!value || typeof value !== "object") {
    return { ok: false, message: "Could not delete that upload." };
  }
  const row = value as Record<string, unknown>;
  if (row.ok === false) {
    return {
      ok: false,
      message:
        typeof row.message === "string"
          ? row.message
          : "That upload was already deleted.",
    };
  }
  if (row.ok !== true || typeof row.filename !== "string") {
    return { ok: false, message: "Could not delete that upload." };
  }
  return {
    ok: true,
    filename: row.filename,
    removedCount: toNumber(row.removed_count),
    revertedCount: toNumber(row.reverted_count),
    keptCount: toNumber(row.kept_count),
  };
}

export async function deleteCsvUpload(uploadId: number): Promise<DeleteUploadResult> {
  if (!Number.isInteger(uploadId) || uploadId <= 0) {
    return { ok: false, message: "That upload does not exist." };
  }

  const { current: business } = await getBusinessContext();
  if (!business) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("delete_csv_upload", {
    p_upload_id: uploadId,
    p_business_id: business.id,
  });
  if (error) return { ok: false, message: error.message };

  const result = asDeleteResult(data);
  if (!result.ok) return result;

  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/upload");
  revalidatePath("/inventory");
  return result;
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
