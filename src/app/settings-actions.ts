"use server";

import { revalidatePath } from "next/cache";

import { getBusinessContext } from "@/app/business-actions";
import {
  builtinTemplate,
  BUILTIN_LABELS,
  BUILTIN_SLOTS,
  type CostLineInput,
  type CostMode,
  type CostSlot,
  type CostSource,
  validateRecipe,
} from "@/lib/cost-recipe";
import { parseMoneyAmount } from "@/lib/opening-balance";
import { lineFromRow } from "@/lib/recipe-rows";
import { createClient, type UserClient } from "@/lib/supabase/server";
import type { Product, ProductCostLine } from "@/lib/supabase/database.types";

function revalidateSettings() {
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/settings");
}

export type ProductWithLines = Product & { lines: ProductCostLine[] };

async function seedBuiltinLines(
  supabase: UserClient,
  productId: number,
  productCostPercent: number | null,
) {
  const rows = builtinTemplate().map((line) => ({
    product_id: productId,
    slot: line.slot,
    label: line.label,
    mode: line.mode,
    source: line.source,
    value:
      line.slot === "product_cost" && productCostPercent != null
        ? productCostPercent
        : null,
    sort_order: line.sort_order,
  }));
  const { error } = await supabase.from("product_cost_lines").insert(rows);
  if (error) throw new Error(error.message);
}

export async function ensureDefaultProduct(): Promise<ProductWithLines | null> {
  const { current } = await getBusinessContext();
  if (!current) return null;
  const supabase = await createClient();

  const { data: existing, error: listError } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", current.id)
    .order("id", { ascending: true });
  if (listError) throw new Error(listError.message);

  let products = existing ?? [];
  if (products.length === 0) {
    const { data: created, error } = await supabase
      .from("products")
      .insert({
        business_id: current.id,
        name: "Standard order",
        is_default: true,
      })
      .select("*")
      .single();
    if (error || !created) throw new Error(error?.message ?? "Could not create a default item.");
    const ratio =
      current.inventory_cost_ratio == null
        ? null
        : Math.round(current.inventory_cost_ratio * 10000) / 100;
    await seedBuiltinLines(supabase, created.id, ratio);
    products = [created];
  }

  let defaultProduct = products.find((product) => product.is_default) ?? products[0];
  if (!defaultProduct.is_default) {
    const { error } = await supabase
      .from("products")
      .update({ is_default: true })
      .eq("id", defaultProduct.id)
      .eq("business_id", current.id);
    if (error) throw new Error(error.message);
    defaultProduct = { ...defaultProduct, is_default: true };
  }

  const { data: lines, error: lineError } = await supabase
    .from("product_cost_lines")
    .select("*")
    .eq("product_id", defaultProduct.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (lineError) throw new Error(lineError.message);

  if (!lines || lines.length === 0) {
    const ratio =
      current.inventory_cost_ratio == null
        ? null
        : Math.round(current.inventory_cost_ratio * 10000) / 100;
    await seedBuiltinLines(supabase, defaultProduct.id, ratio);
    const { data: seeded, error } = await supabase
      .from("product_cost_lines")
      .select("*")
      .eq("product_id", defaultProduct.id)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { ...defaultProduct, lines: seeded ?? [] };
  }

  return { ...defaultProduct, lines };
}

export async function loadDefaultCostLines(): Promise<CostLineInput[]> {
  const product = await ensureDefaultProduct();
  if (!product) return [];
  return product.lines.map(lineFromRow);
}

export async function listProductsWithLines(): Promise<ProductWithLines[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  await ensureDefaultProduct();
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", current.id)
    .order("is_default", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const list = products ?? [];
  const ids = list.map((product) => product.id);
  const { data: lines, error: lineError } = await supabase
    .from("product_cost_lines")
    .select("*")
    .in("product_id", ids)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (lineError) throw new Error(lineError.message);
  const byProduct = new Map<number, ProductCostLine[]>();
  for (const line of lines ?? []) {
    const bucket = byProduct.get(line.product_id) ?? [];
    bucket.push(line);
    byProduct.set(line.product_id, bucket);
  }
  return list.map((product) => ({
    ...product,
    lines: byProduct.get(product.id) ?? [],
  }));
}

export async function addProduct(
  formData: FormData,
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) return { ok: false, message: "Create a business before continuing." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Enter an item name." };

  const defaults = await ensureDefaultProduct();
  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("products")
    .insert({
      business_id: current.id,
      name,
      is_default: false,
      selling_price: defaults?.selling_price ?? null,
    })
    .select("*")
    .single();
  if (error || !created) {
    return { ok: false, message: error?.message ?? "Could not add the item." };
  }

  const source = defaults?.lines ?? [];
  const copies =
    source.length > 0
      ? source.map((line) => ({
          product_id: created.id,
          slot: line.slot,
          label: line.label,
          mode: line.mode,
          source: line.source,
          value: line.value,
          sort_order: line.sort_order,
        }))
      : builtinTemplate().map((line) => ({
          product_id: created.id,
          slot: line.slot,
          label: line.label,
          mode: line.mode,
          source: line.source,
          value: line.value,
          sort_order: line.sort_order,
        }));
  const { error: copyError } = await supabase.from("product_cost_lines").insert(copies);
  if (copyError) return { ok: false, message: copyError.message };

  revalidateSettings();
  return { ok: true, id: created.id };
}

export async function setDefaultProduct(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) return { ok: false, message: "Create a business before continuing." };
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("products")
    .select("id")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();
  if (!match) return { ok: false, message: "That item does not exist." };

  const { error: clearError } = await supabase
    .from("products")
    .update({ is_default: false })
    .eq("business_id", current.id)
    .neq("id", id);
  if (clearError) return { ok: false, message: clearError.message };

  const { error } = await supabase
    .from("products")
    .update({ is_default: true })
    .eq("id", id)
    .eq("business_id", current.id);
  if (error) return { ok: false, message: error.message };
  revalidateSettings();
  return { ok: true };
}

export async function deleteProduct(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) return { ok: false, message: "Create a business before continuing." };
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("products")
    .select("id, is_default")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();
  if (!match) return { ok: false, message: "That item does not exist." };
  if (match.is_default) {
    return { ok: false, message: "Pick another default item before deleting this one." };
  }
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("business_id", current.id);
  if (error) return { ok: false, message: error.message };
  revalidateSettings();
  return { ok: true };
}

function parseLinePayload(raw: unknown): CostLineInput[] | { error: string } {
  if (!Array.isArray(raw)) return { error: "Recipe data was invalid." };
  const lines: CostLineInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return { error: "Recipe data was invalid." };
    const row = item as Record<string, unknown>;
    const slot = String(row.slot ?? "");
    const allowed: CostSlot[] = [...BUILTIN_SLOTS, "custom"];
    if (!allowed.includes(slot as CostSlot)) return { error: "Unknown cost line." };
    const sourceKind: CostSource = row.source === "auto" ? "auto" : "manual";
    if (sourceKind === "auto") {
      if (slot !== "delivery") {
        return { error: "Only Delivery can use the Pathao fee automatically." };
      }
      lines.push({
        id: typeof row.id === "number" ? row.id : undefined,
        slot: "delivery",
        label: BUILTIN_LABELS.delivery,
        mode: "fixed",
        source: "auto",
        value: null,
        sort_order: Number(row.sort_order) || lines.length * 10,
      });
      continue;
    }
    const mode = String(row.mode ?? "");
    if (mode !== "fixed" && mode !== "percent") {
      return { error: "Each line must be a fixed amount or a percent." };
    }
    const label =
      slot === "custom"
        ? String(row.label ?? "").trim()
        : BUILTIN_LABELS[slot as keyof typeof BUILTIN_LABELS];
    let value: number | null = null;
    if (row.value != null && String(row.value).trim() !== "") {
      const parsed = parseMoneyAmount(String(row.value), {
        emptyMessage: "Enter an amount.",
      });
      if (!parsed.ok) return { error: parsed.message };
      value = parsed.value;
    }
    lines.push({
      id: typeof row.id === "number" ? row.id : undefined,
      slot: slot as CostSlot,
      label: label || "Extra",
      mode: mode as CostMode,
      source: "manual",
      value,
      sort_order: Number(row.sort_order) || lines.length * 10,
    });
  }
  const check = validateRecipe(lines);
  if (!check.ok) return { error: check.message };
  return lines;
}

export async function saveProductRecipe(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) return { ok: false, message: "Create a business before continuing." };
  const productId = Number(formData.get("product_id"));
  if (!Number.isFinite(productId)) return { ok: false, message: "Pick an item." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Enter an item name." };

  let sellingPrice: number | null = null;
  const sellingRaw = String(formData.get("selling_price") ?? "").trim();
  if (sellingRaw !== "") {
    const parsed = parseMoneyAmount(sellingRaw, { emptyMessage: "Enter a selling price." });
    if (!parsed.ok) return parsed;
    sellingPrice = parsed.value;
  }

  let parsedLines: unknown;
  try {
    parsedLines = JSON.parse(String(formData.get("lines") ?? "[]"));
  } catch {
    return { ok: false, message: "Recipe data was invalid." };
  }
  const lines = parseLinePayload(parsedLines);
  if ("error" in lines) return { ok: false, message: lines.error };

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", current.id)
    .maybeSingle();
  if (!product) return { ok: false, message: "That item does not exist." };

  const { error: productError } = await supabase
    .from("products")
    .update({ name, selling_price: sellingPrice })
    .eq("id", productId);
  if (productError) return { ok: false, message: productError.message };

  const { error: deleteError } = await supabase
    .from("product_cost_lines")
    .delete()
    .eq("product_id", productId);
  if (deleteError) return { ok: false, message: deleteError.message };

  const { error: insertError } = await supabase.from("product_cost_lines").insert(
    lines.map((line, index) => ({
      product_id: productId,
      slot: line.slot,
      label: line.label,
      mode: line.source === "auto" ? "fixed" : line.mode,
      source: line.source,
      value: line.source === "auto" ? null : line.value,
      sort_order: line.sort_order || (index + 1) * 10,
    })),
  );
  if (insertError) return { ok: false, message: insertError.message };

  revalidateSettings();
  return { ok: true };
}
