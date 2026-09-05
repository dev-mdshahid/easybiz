"use server";

import { getBusinessContext } from "@/app/business-actions";
import { parseInventoryMovement } from "@/lib/inventory";
import { createClient } from "@/lib/supabase/server";
import type { InventoryMovement } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

function revalidateInventory() {
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/settings");
}

export async function listInventoryMovements(): Promise<InventoryMovement[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("business_id", current.id)
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addInventoryMovement(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const parsed = parseInventoryMovement(
    String(formData.get("kind") ?? ""),
    String(formData.get("amount") ?? ""),
    String(formData.get("occurred_on") ?? ""),
    String(formData.get("note") ?? ""),
  );
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_movements").insert({
    business_id: current.id,
    kind: parsed.kind,
    amount: parsed.amount,
    occurred_on: parsed.occurredOn,
    note: parsed.note,
  });

  if (error) return { ok: false, message: error.message };
  revalidateInventory();
  return { ok: true };
}

export async function deleteInventoryMovement(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("inventory_movements")
    .select("id")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();

  if (lookupError) return { ok: false, message: lookupError.message };
  if (!existing) {
    return { ok: false, message: "That movement does not exist." };
  }

  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("id", id)
    .eq("business_id", current.id);

  if (error) return { ok: false, message: error.message };
  revalidateInventory();
  return { ok: true };
}
