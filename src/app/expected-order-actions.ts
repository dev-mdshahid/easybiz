"use server";

import { revalidatePath } from "next/cache";

import { getBusinessContext } from "@/app/business-actions";
import { extractOrdersFromImages, inferPathaoLocations, type ChatImage } from "@/lib/ai-client";
import {
  getAiProvider,
  inferAiProvider,
  isAiProvider,
  resolveAiConnection,
  resolveAiModel,
  type AiProvider,
} from "@/lib/ai-providers";
import {
  ITEM_TYPES,
  merchantOrderId,
  normalizeExpectedOrder,
  statusAfterEdit,
  type ExtractedOrderDraft,
  type ItemType,
  type ProductHint,
} from "@/lib/expected-order";
import { buildPathaoBulkCsv } from "@/lib/pathao-bulk-csv";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BusinessSettings,
  ExpectedOrder,
  Json,
} from "@/lib/supabase/database.types";

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function revalidateExpected() {
  revalidatePath("/expected-orders");
  revalidatePath("/settings");
}

export type PublicOrderCreationSettings = {
  hasApiKey: boolean;
  apiKeyHint: string;
  ai_provider: AiProvider;
  ai_model: string;
  default_store_name: string;
  default_item_type: ItemType;
  default_item_weight: number;
};

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`;
}

function asItemType(value: string | null | undefined): ItemType {
  return value === "document" ? "document" : "parcel";
}

function defaultsFromSettings(row: BusinessSettings | null): {
  storeName: string;
  itemType: ItemType;
  itemWeight: number;
} {
  return {
    storeName: row?.default_store_name ?? "",
    itemType: asItemType(row?.default_item_type),
    itemWeight: Number(row?.default_item_weight ?? 0.5) || 0.5,
  };
}

async function loadSettingsRow(
  businessId: number,
): Promise<BusinessSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function toPublic(row: BusinessSettings | null): PublicOrderCreationSettings {
  const key = row?.ai_api_key ?? "";
  const connection = resolveAiConnection({
    provider: row?.ai_provider,
    baseUrl: row?.ai_base_url,
    model: row?.ai_model,
  });
  return {
    hasApiKey: key.trim().length > 0,
    apiKeyHint: maskApiKey(key),
    ai_provider: connection.provider,
    ai_model: connection.model,
    default_store_name: row?.default_store_name ?? "",
    default_item_type: asItemType(row?.default_item_type),
    default_item_weight: Number(row?.default_item_weight ?? 0.5) || 0.5,
  };
}

export async function getOrderCreationSettings(): Promise<PublicOrderCreationSettings | null> {
  const { current } = await getBusinessContext();
  if (!current) return null;
  const row = await loadSettingsRow(current.id);
  return toPublic(row);
}

export async function saveOrderCreationSettings(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const existing = await loadSettingsRow(current.id);
  const incomingKey = String(formData.get("ai_api_key") ?? "");
  const keepExisting = incomingKey.trim() === "";
  const apiKey = keepExisting ? (existing?.ai_api_key ?? "") : incomingKey.trim();

  const providerRaw = String(formData.get("ai_provider") ?? "");
  if (!isAiProvider(providerRaw)) {
    return { ok: false, message: "Choose OpenAI, Gemini, or OpenRouter." };
  }
  const provider = inferAiProvider(providerRaw);
  const spec = getAiProvider(provider);
  const model = resolveAiModel(provider, String(formData.get("ai_model") ?? ""));
  const storeName = String(formData.get("default_store_name") ?? "").trim();
  const itemType = asItemType(String(formData.get("default_item_type") ?? ""));
  const weightRaw = Number(String(formData.get("default_item_weight") ?? "0.5"));
  if (!Number.isFinite(weightRaw) || weightRaw < 0.5 || weightRaw > 10) {
    return { ok: false, message: "Default weight must be between 0.5 and 10 kg." };
  }
  if (!ITEM_TYPES.includes(itemType)) {
    return { ok: false, message: "Item type must be parcel or document." };
  }

  const supabase = createAdminClient();
  const payload = {
    business_id: current.id,
    ai_api_key: apiKey,
    ai_provider: provider,
    ai_base_url: spec.baseUrl,
    ai_model: model,
    default_store_name: storeName,
    default_item_type: itemType,
    default_item_weight: weightRaw,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("business_settings").upsert(payload, {
    onConflict: "business_id",
  });
  if (error) return { ok: false, message: error.message };
  revalidateExpected();
  return { ok: true };
}

async function loadProducts(businessId: number): Promise<ProductHint[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, selling_price")
    .eq("business_id", businessId)
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    selling_price: row.selling_price == null ? null : Number(row.selling_price),
  }));
}

function draftFromForm(formData: FormData) {
  return {
    recipient_name: String(formData.get("recipient_name") ?? ""),
    recipient_phone: String(formData.get("recipient_phone") ?? ""),
    recipient_address: String(formData.get("recipient_address") ?? ""),
    recipient_city: String(formData.get("recipient_city") ?? ""),
    recipient_zone: String(formData.get("recipient_zone") ?? ""),
    recipient_area: String(formData.get("recipient_area") ?? ""),
    amount_to_collect: String(formData.get("amount_to_collect") ?? ""),
    item_quantity: String(formData.get("item_quantity") ?? "1"),
    item_weight: String(formData.get("item_weight") ?? "0.5"),
    item_desc: String(formData.get("item_desc") ?? ""),
    special_instruction: String(formData.get("special_instruction") ?? ""),
    item_type: String(formData.get("item_type") ?? "parcel"),
    store_name: String(formData.get("store_name") ?? ""),
  };
}

async function fillCityZoneFromAddress(
  settings: BusinessSettings | null,
  drafts: ExtractedOrderDraft[],
): Promise<ExtractedOrderDraft[]> {
  const apiKey = settings?.ai_api_key?.trim() ?? "";
  if (!apiKey || drafts.length === 0) return drafts;

  const targets = drafts
    .map((draft, index) => ({
      index,
      address: String(draft.recipient_address ?? "").trim(),
      city: draft.recipient_city,
      zone: draft.recipient_zone,
      area: draft.recipient_area,
    }))
    .filter((row) => row.address.length >= 8);
  if (targets.length === 0) return drafts;

  try {
    const inferred = await inferPathaoLocations({
      apiKey,
      provider: settings?.ai_provider,
      baseUrl: settings?.ai_base_url,
      model: settings?.ai_model,
      rows: targets.map((row) => ({
        address: row.address,
        city: row.city,
        zone: row.zone,
        area: row.area,
      })),
    });
    const next = drafts.slice();
    targets.forEach((row, i) => {
      const hit = inferred[i];
      if (!hit) return;
      next[row.index] = {
        ...next[row.index],
        recipient_city: hit.city || next[row.index].recipient_city,
        recipient_zone: hit.zone || next[row.index].recipient_zone,
        recipient_area: hit.area || next[row.index].recipient_area,
      };
    });
    return next;
  } catch {
    return drafts;
  }
}

async function findDuplicateWarning(
  businessId: number,
  phone: string,
  amount: number,
  exceptId?: number,
): Promise<string | null> {
  if (!phone) return null;
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const supabase = createAdminClient();
  let query = supabase
    .from("expected_orders")
    .select("id")
    .eq("business_id", businessId)
    .eq("recipient_phone", phone)
    .eq("amount_to_collect", amount)
    .neq("status", "discarded")
    .gte("created_at", since);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query.limit(1);
  if (error) return null;
  if (data && data.length > 0) {
    return "Possible duplicate: same phone and COD in the last 48 hours.";
  }
  return null;
}

async function insertNormalizedOrder(options: {
  businessId: number;
  intakeId: number | null;
  normalized: ReturnType<typeof normalizeExpectedOrder>;
  extraction: Json | null;
}): Promise<ExpectedOrder> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expected_orders")
    .insert({
      business_id: options.businessId,
      intake_id: options.intakeId,
      product_id: options.normalized.product_id,
      item_type: options.normalized.item_type,
      store_name: options.normalized.store_name,
      merchant_order_id: "",
      recipient_name: options.normalized.recipient_name,
      recipient_phone: options.normalized.recipient_phone,
      recipient_address: options.normalized.recipient_address,
      recipient_city: options.normalized.recipient_city,
      recipient_zone: options.normalized.recipient_zone,
      recipient_area: options.normalized.recipient_area,
      amount_to_collect: options.normalized.amount_to_collect,
      item_quantity: options.normalized.item_quantity,
      item_weight: options.normalized.item_weight,
      item_desc: options.normalized.item_desc,
      special_instruction: options.normalized.special_instruction,
      status: options.normalized.status,
      warnings: options.normalized.warnings as unknown as Json,
      extraction: options.extraction,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Could not save the expected order.");
  }

  const merchant = merchantOrderId(data.id);
  const { data: updated, error: updateError } = await supabase
    .from("expected_orders")
    .update({ merchant_order_id: merchant })
    .eq("id", data.id)
    .eq("business_id", options.businessId)
    .select("*")
    .single();
  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Could not assign merchant order id.");
  }
  return updated;
}

export async function listExpectedOrders(params?: {
  q?: string;
  status?: string;
}): Promise<ExpectedOrder[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  const supabase = createAdminClient();
  let query = supabase
    .from("expected_orders")
    .select("*")
    .eq("business_id", current.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (
    params?.status &&
    ["needs_review", "ready", "exported", "discarded"].includes(params.status)
  ) {
    query = query.eq("status", params.status);
  }

  const q = params?.q?.trim().replace(/[%*,()]/g, "");
  if (q) {
    query = query.or(
      `recipient_name.ilike.%${q}%,recipient_phone.ilike.%${q}%,merchant_order_id.ilike.%${q}%,recipient_address.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function filesToImages(formData: FormData): Promise<ChatImage[]> {
  const files: File[] = [];
  for (const value of formData.getAll("images")) {
    if (value instanceof File && value.size > 0) files.push(value);
  }
  if (files.length === 0) {
    throw new Error("Paste or attach at least one screenshot.");
  }
  if (files.length > MAX_IMAGES) {
    throw new Error(`Attach at most ${MAX_IMAGES} screenshots at a time.`);
  }

  const images: ChatImage[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name || "Image"} is larger than 8 MB.`);
    }
    const mime = file.type || "image/jpeg";
    if (!ALLOWED_IMAGE_TYPES.has(mime)) {
      throw new Error("Use JPEG, PNG, WebP, or GIF screenshots.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({
      mimeType: mime,
      dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
    });
  }
  return images;
}

export async function extractExpectedOrders(
  formData: FormData,
): Promise<
  | { ok: true; orders: ExpectedOrder[]; empty: boolean }
  | { ok: false; message: string; missingKey?: boolean }
> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const settings = await loadSettingsRow(current.id);
  const apiKey = settings?.ai_api_key?.trim() ?? "";
  if (!apiKey) {
    return {
      ok: false,
      missingKey: true,
      message: "Add an AI API key in Settings before extracting orders.",
    };
  }

  let images: ChatImage[];
  try {
    images = await filesToImages(formData);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not read images.",
    };
  }

  const note = String(formData.get("note") ?? "").trim() || null;
  const products = await loadProducts(current.id);
  const defaults = defaultsFromSettings(settings);
  const supabase = createAdminClient();

  const { data: intake, error: intakeError } = await supabase
    .from("expected_order_intakes")
    .insert({
      business_id: current.id,
      note,
      image_count: images.length,
      model: resolveAiModel(settings?.ai_provider, settings?.ai_model),
    })
    .select("*")
    .single();
  if (intakeError || !intake) {
    return {
      ok: false,
      message: intakeError?.message ?? "Could not start extraction.",
    };
  }

  try {
    const extracted = await extractOrdersFromImages({
      apiKey,
      provider: settings?.ai_provider,
      baseUrl: settings?.ai_base_url,
      model: settings?.ai_model,
      images,
      note: note ?? undefined,
      products,
    });

    await supabase
      .from("expected_order_intakes")
      .update({
        model: extracted.model,
        raw_ai_response: extracted.raw as Json,
        error_message: null,
      })
      .eq("id", intake.id);

    const located = await fillCityZoneFromAddress(settings, extracted.orders);

    const saved: ExpectedOrder[] = [];
    for (const order of located) {
      const normalized = normalizeExpectedOrder(order, defaults, products);
      const duplicate = await findDuplicateWarning(
        current.id,
        normalized.recipient_phone,
        normalized.amount_to_collect,
      );
      if (duplicate) normalized.warnings.push(duplicate);
      saved.push(
        await insertNormalizedOrder({
          businessId: current.id,
          intakeId: intake.id,
          normalized,
          extraction: order as unknown as Json,
        }),
      );
    }

    revalidateExpected();
    return { ok: true, orders: saved, empty: saved.length === 0 };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction failed.";
    await supabase
      .from("expected_order_intakes")
      .update({ error_message: message })
      .eq("id", intake.id);
    return { ok: false, message };
  }
}

export async function addExpectedOrder(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }
  const settings = await loadSettingsRow(current.id);
  const products = await loadProducts(current.id);
  const [draft] = await fillCityZoneFromAddress(settings, [draftFromForm(formData)]);
  const normalized = normalizeExpectedOrder(
    draft,
    defaultsFromSettings(settings),
    products,
  );
  const duplicate = await findDuplicateWarning(
    current.id,
    normalized.recipient_phone,
    normalized.amount_to_collect,
  );
  if (duplicate) normalized.warnings.push(duplicate);

  await insertNormalizedOrder({
    businessId: current.id,
    intakeId: null,
    normalized,
    extraction: null,
  });
  revalidateExpected();
  return { ok: true };
}

export async function updateExpectedOrder(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That order does not exist." };
  }

  const supabase = createAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("expected_orders")
    .select("*")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();
  if (lookupError) return { ok: false, message: lookupError.message };
  if (!existing) return { ok: false, message: "That order does not exist." };
  if (existing.status === "discarded") {
    return { ok: false, message: "Discarded orders cannot be edited." };
  }

  const settings = await loadSettingsRow(current.id);
  const products = await loadProducts(current.id);
  const [draft] = await fillCityZoneFromAddress(settings, [draftFromForm(formData)]);
  const normalized = normalizeExpectedOrder(
    draft,
    defaultsFromSettings(settings),
    products,
  );
  const duplicate = await findDuplicateWarning(
    current.id,
    normalized.recipient_phone,
    normalized.amount_to_collect,
    id,
  );
  if (duplicate) normalized.warnings.push(duplicate);

  const status = statusAfterEdit(normalized.status, existing.status);
  const { error } = await supabase
    .from("expected_orders")
    .update({
      product_id: normalized.product_id,
      item_type: normalized.item_type,
      store_name: normalized.store_name,
      recipient_name: normalized.recipient_name,
      recipient_phone: normalized.recipient_phone,
      recipient_address: normalized.recipient_address,
      recipient_city: normalized.recipient_city,
      recipient_zone: normalized.recipient_zone,
      recipient_area: normalized.recipient_area,
      amount_to_collect: normalized.amount_to_collect,
      item_quantity: normalized.item_quantity,
      item_weight: normalized.item_weight,
      item_desc: normalized.item_desc,
      special_instruction: normalized.special_instruction,
      status,
      warnings: normalized.warnings as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", current.id);
  if (error) return { ok: false, message: error.message };
  revalidateExpected();
  return { ok: true };
}

export async function discardExpectedOrder(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("expected_orders")
    .update({
      status: "discarded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", current.id)
    .neq("status", "discarded");
  if (error) return { ok: false, message: error.message };
  revalidateExpected();
  return { ok: true };
}

export async function exportExpectedOrdersCsv(
  ids: number[],
): Promise<
  | {
      ok: true;
      csv: string;
      filename: string;
      exportedCount: number;
      skippedCount: number;
    }
  | { ok: false; message: string }
> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }
  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (unique.length === 0) {
    return { ok: false, message: "Select at least one order to export." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expected_orders")
    .select("*")
    .eq("business_id", current.id)
    .in("id", unique);
  if (error) return { ok: false, message: error.message };

  const rows = data ?? [];
  const exportable = rows.filter(
    (row) => row.status === "ready" || row.status === "exported",
  );
  const blocked = rows.filter(
    (row) => row.status === "needs_review" || row.status === "discarded",
  );
  if (exportable.length === 0) {
    const reason =
      blocked.length > 0
        ? "Selected orders still need review or were discarded."
        : "Those orders were not found.";
    return { ok: false, message: reason };
  }

  const csv = buildPathaoBulkCsv(
    exportable.map((row) => ({
      item_type: row.item_type,
      store_name: row.store_name,
      merchant_order_id: row.merchant_order_id,
      recipient_name: row.recipient_name,
      recipient_phone: row.recipient_phone,
      recipient_address: row.recipient_address,
      recipient_city: row.recipient_city,
      recipient_zone: row.recipient_zone,
      recipient_area: row.recipient_area,
      amount_to_collect: row.amount_to_collect,
      item_quantity: row.item_quantity,
      item_weight: row.item_weight,
      item_desc: row.item_desc,
      special_instruction: row.special_instruction,
    })),
  );

  const now = new Date().toISOString();
  const { error: markError } = await supabase
    .from("expected_orders")
    .update({
      status: "exported",
      exported_at: now,
      updated_at: now,
    })
    .eq("business_id", current.id)
    .in(
      "id",
      exportable.map((row) => row.id),
    );
  if (markError) return { ok: false, message: markError.message };

  const ymd = now.slice(0, 10);
  revalidateExpected();
  return {
    ok: true,
    csv,
    filename: `pathao-orders-${ymd}.csv`,
    exportedCount: exportable.length,
    skippedCount: blocked.length,
  };
}
