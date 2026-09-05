"use server";

import { revalidatePath } from "next/cache";

import { getBusinessContext } from "@/app/business-actions";
import { extractOrdersFromImages, formatOrdersInEnglish, type ChatImage, type ExtractedAiOrder } from "@/lib/ai-client";
import {
  getAiProvider,
  inferAiProvider,
  isAiProvider,
  resolveAiConnection,
  resolveAiModel,
  type AiProvider,
} from "@/lib/ai-providers";
import {
  EXPECTED_ORDER_MAX_IMAGES,
  ITEM_TYPES,
  clampScreenshotBatchSize,
  collapseExtractedOrders,
  matchDraftToQueuePrior,
  merchantOrderId,
  normalizeExpectedOrder,
  overlayPriorWithDraft,
  statusAfterEdit,
  type ExtractedOrderDraft,
  type ItemType,
  type ProductHint,
  type QueuePriorOrder,
} from "@/lib/expected-order";
import { buildPathaoBulkCsv } from "@/lib/pathao-bulk-csv";
import { alignCitiesToSource, explicitCityFromText } from "@/lib/pathao-address";
import { loadOwnedBusinessSettings, persistOwnedBusinessSettings } from "@/lib/owned-settings";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessSettings,
  ExpectedOrder,
  Json,
} from "@/lib/supabase/database.types";

const MAX_IMAGES = EXPECTED_ORDER_MAX_IMAGES;
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
  revalidatePath("/carriers");
}

export type PublicOrderCreationSettings = {
  hasApiKey: boolean;
  apiKeyHint: string;
  ai_provider: AiProvider;
  ai_model: string;
  default_store_name: string;
  default_item_type: ItemType;
  default_item_weight: number;
  screenshot_batch_size: number;
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
  return loadOwnedBusinessSettings(businessId);
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
    screenshot_batch_size: clampScreenshotBatchSize(row?.screenshot_batch_size),
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
  const batchSize = clampScreenshotBatchSize(
    String(formData.get("screenshot_batch_size") ?? EXPECTED_ORDER_MAX_IMAGES),
  );

  try {
    await persistOwnedBusinessSettings(current.id, {
      ai_api_key: apiKey,
      ai_provider: provider,
      ai_base_url: spec.baseUrl,
      ai_model: model,
      default_store_name: storeName,
      default_item_type: itemType,
      default_item_weight: weightRaw,
      screenshot_batch_size: batchSize,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save settings.",
    };
  }
  revalidateExpected();
  return { ok: true };
}

async function loadProducts(businessId: number): Promise<ProductHint[]> {
  const supabase = await createClient();
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
    recipient_address_raw: String(formData.get("recipient_address_raw") ?? ""),
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

async function polishDraftAddresses(
  settings: BusinessSettings | null,
  drafts: ExtractedOrderDraft[],
): Promise<ExtractedOrderDraft[]> {
  const apiKey = settings?.ai_api_key?.trim() ?? "";
  if (!apiKey || drafts.length === 0) return drafts;

  const targets = drafts
    .map((draft, index) => ({
      index,
      recipient_name: String(draft.recipient_name ?? "").trim(),
      recipient_address: String(draft.recipient_address ?? "").trim(),
      recipient_city: String(draft.recipient_city ?? "").trim(),
      item_desc: String(draft.item_desc ?? "").trim(),
      special_instruction: String(draft.special_instruction ?? "").trim(),
      warnings: (draft.warnings ?? []).filter(
        (warning): warning is string => typeof warning === "string" && warning.trim() !== "",
      ),
    }))
    .filter(
      (row) =>
        row.recipient_name ||
        row.recipient_address ||
        row.recipient_city ||
        row.item_desc ||
        row.special_instruction ||
        row.warnings.length > 0,
    );
  if (targets.length === 0) return drafts;

  try {
    const polished = await formatOrdersInEnglish({
      apiKey,
      provider: settings?.ai_provider,
      baseUrl: settings?.ai_base_url,
      model: settings?.ai_model,
      rows: targets.map((row) => ({
        recipient_name: row.recipient_name,
        recipient_address: row.recipient_address,
        recipient_city: row.recipient_city,
        item_desc: row.item_desc,
        special_instruction: row.special_instruction,
        warnings: row.warnings,
      })),
    });
    const next = drafts.slice();
    targets.forEach((row, i) => {
      const formatted = polished[i];
      if (!formatted) return;
      const source =
        next[row.index].recipient_address_raw || row.recipient_address;
      const address = alignCitiesToSource(
        source,
        formatted.recipient_address || row.recipient_address,
      );
      next[row.index] = {
        ...next[row.index],
        recipient_name: formatted.recipient_name || next[row.index].recipient_name,
        recipient_address_raw:
          next[row.index].recipient_address_raw || next[row.index].recipient_address,
        recipient_address: address,
        recipient_city: row.recipient_city
          ? formatted.recipient_city || row.recipient_city
          : explicitCityFromText(address) || "",
        item_desc: formatted.item_desc || next[row.index].item_desc,
        special_instruction:
          formatted.special_instruction || next[row.index].special_instruction,
        warnings: formatted.warnings.length > 0 ? formatted.warnings : next[row.index].warnings,
      };
    });
    return next;
  } catch {
    return drafts;
  }
}

function draftsFromExtracted(orders: ExtractedAiOrder[]): ExtractedOrderDraft[] {
  return orders.map((order) => {
    const written = String(order.recipient_address_as_written || order.recipient_address || "").trim();
    const cleaned = String(order.recipient_address || written).trim();
    const address = alignCitiesToSource(written, cleaned);
    return {
      ...order,
      recipient_address_raw: written,
      recipient_address: address,
      recipient_city: explicitCityFromText(address) || "",
      source_image_indexes: order.source_image_indexes,
    };
  });
}

async function findDuplicateWarning(
  businessId: number,
  phone: string,
  amount: number,
  exceptId?: number,
): Promise<string | null> {
  if (!phone) return null;
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
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

function commitPayload(
  normalized: ReturnType<typeof normalizeExpectedOrder>,
  extraction: Json,
) {
  return {
    product_id: normalized.product_id,
    item_type: normalized.item_type,
    store_name: normalized.store_name,
    recipient_name: normalized.recipient_name,
    recipient_phone: normalized.recipient_phone,
    recipient_address: normalized.recipient_address,
    recipient_address_raw: normalized.recipient_address_raw,
    recipient_city: normalized.recipient_city,
    recipient_zone: normalized.recipient_zone,
    recipient_area: normalized.recipient_area,
    amount_to_collect: normalized.amount_to_collect,
    item_quantity: normalized.item_quantity,
    item_weight: normalized.item_weight,
    item_desc: normalized.item_desc,
    special_instruction: normalized.special_instruction,
    status: normalized.status,
    warnings: normalized.warnings,
    extraction,
  };
}

function parseQueuePriorIds(formData: FormData): number[] {
  const raw = String(formData.get("queue_prior_ids") ?? "").trim();
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,\s]+/)
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];
}

function asQueuePrior(row: ExpectedOrder): QueuePriorOrder {
  return {
    id: row.id,
    recipient_phone: row.recipient_phone,
    amount_to_collect: Number(row.amount_to_collect) || 0,
    status: row.status,
  };
}

async function insertNormalizedOrder(options: {
  businessId: number;
  intakeId: number | null;
  normalized: ReturnType<typeof normalizeExpectedOrder>;
  extraction: Json | null;
}): Promise<ExpectedOrder> {
  const supabase = await createClient();
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
      recipient_address_raw: options.normalized.recipient_address_raw,
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
  const supabase = await createClient();
  let query = supabase
    .from("expected_orders")
    .select("*")
    .eq("business_id", current.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (
    params?.status &&
    ["needs_review", "ready", "exported", "created", "failed", "discarded"].includes(params.status)
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
  const supabase = await createClient();

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

    const polished = await polishDraftAddresses(
      settings,
      draftsFromExtracted(collapseExtractedOrders(extracted.orders)),
    );

    const priorIds = parseQueuePriorIds(formData);
    let priorRows: ExpectedOrder[] = [];
    if (priorIds.length > 0) {
      const { data: loaded, error: priorError } = await supabase
        .from("expected_orders")
        .select("*")
        .eq("business_id", current.id)
        .in("id", priorIds);
      if (priorError) throw new Error(priorError.message);
      priorRows = loaded ?? [];
    }
    const priorSummaries = priorRows.map(asQueuePrior);
    const usedPriorIds = new Set<number>();
    const inserts: Json[] = [];
    const updates: Json[] = [];
    const queueId = String(formData.get("queue_id") ?? "").trim();

    for (const order of polished) {
      const extraction = (
        queueId ? { ...order, queue_id: queueId } : order
      ) as unknown as Json;
      const decision = matchDraftToQueuePrior(order, priorSummaries, usedPriorIds);
      if (decision.action === "skip") {
        continue;
      }
      if (decision.action === "update") {
        const prior = priorRows.find((row) => row.id === decision.priorId);
        if (!prior) {
          const normalized = normalizeExpectedOrder(order, defaults, products);
          const duplicate = await findDuplicateWarning(
            current.id,
            normalized.recipient_phone,
            normalized.amount_to_collect,
          );
          if (duplicate) normalized.warnings.push(duplicate);
          inserts.push(commitPayload(normalized, extraction));
          continue;
        }
        usedPriorIds.add(prior.id);
        const incoming = normalizeExpectedOrder(order, defaults, products);
        const merged = normalizeExpectedOrder(
          overlayPriorWithDraft(prior, incoming),
          defaults,
          products,
        );
        const status = statusAfterEdit(merged.status, prior.status);
        if (status === "created") continue;
        const duplicate = await findDuplicateWarning(
          current.id,
          merged.recipient_phone,
          merged.amount_to_collect,
          prior.id,
        );
        if (duplicate) merged.warnings.push(duplicate);
        updates.push({
          id: prior.id,
          ...commitPayload(merged, extraction),
          status,
        });
        continue;
      }

      const normalized = normalizeExpectedOrder(order, defaults, products);
      const duplicate = await findDuplicateWarning(
        current.id,
        normalized.recipient_phone,
        normalized.amount_to_collect,
      );
      if (duplicate) normalized.warnings.push(duplicate);
      inserts.push(commitPayload(normalized, extraction));
    }

    const { data: saved, error: commitError } = await supabase.rpc(
      "commit_expected_order_intake",
      {
        p_business_id: current.id,
        p_intake_id: intake.id,
        p_model: extracted.model,
        p_raw: extracted.raw as Json,
        p_orders: inserts,
        p_updates: updates,
      },
    );
    if (commitError) {
      throw new Error(commitError.message);
    }

    let orders = Array.isArray(saved) ? saved : saved ? [saved] : [];
    if ((inserts.length > 0 || updates.length > 0) && orders.length === 0) {
      const updateIds = updates
        .map((row) => Number((row as { id?: number }).id))
        .filter((id) => Number.isInteger(id) && id > 0);
      const { data: insertedRows, error: insertLookupError } = await supabase
        .from("expected_orders")
        .select("*")
        .eq("business_id", current.id)
        .eq("intake_id", intake.id)
        .order("id", { ascending: true });
      if (insertLookupError) throw new Error(insertLookupError.message);
      let updatedRows: ExpectedOrder[] = [];
      if (updateIds.length > 0) {
        const { data: loadedUpdates, error: updateLookupError } = await supabase
          .from("expected_orders")
          .select("*")
          .eq("business_id", current.id)
          .in("id", updateIds);
        if (updateLookupError) throw new Error(updateLookupError.message);
        updatedRows = loadedUpdates ?? [];
      }
      const byId = new Map<number, ExpectedOrder>();
      for (const row of [...(insertedRows ?? []), ...updatedRows]) {
        byId.set(row.id, row);
      }
      orders = [...byId.values()];
    }

    revalidateExpected();
    return { ok: true, orders, empty: polished.length === 0 };
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
  const [draft] = await polishDraftAddresses(settings, [draftFromForm(formData)]);
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

  const supabase = await createClient();
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
  if (existing.status === "created" || existing.pathao_consignment_id) {
    return { ok: false, message: "Orders already created in Pathao cannot be edited." };
  }

  const settings = await loadSettingsRow(current.id);
  const products = await loadProducts(current.id);
  const formDraft = draftFromForm(formData);
  if (!formDraft.recipient_address_raw) {
    formDraft.recipient_address_raw = existing.recipient_address_raw || existing.recipient_address;
  }
  const [draft] = await polishDraftAddresses(settings, [formDraft]);
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
      recipient_address_raw: normalized.recipient_address_raw || existing.recipient_address_raw,
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
  const supabase = await createClient();
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

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expected_orders")
    .select("*")
    .eq("business_id", current.id)
    .in("id", unique);
  if (error) return { ok: false, message: error.message };

  const rows = data ?? [];
  const exportable = rows.filter(
    (row) => row.status === "ready" || row.status === "exported" || row.status === "failed",
  );
  const blocked = rows.filter(
    (row) =>
      row.status === "needs_review" ||
      row.status === "discarded" ||
      row.status === "created",
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
