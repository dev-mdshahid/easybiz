"use server";

import { getBusinessContext } from "@/app/business-actions";
import { parseExpense } from "@/lib/expense";
import { toNumber } from "@/lib/money";
import { roundMoney } from "@/lib/cost-recipe";
import { dhakaYmd } from "@/lib/time";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Expense } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

function revalidateExpenses() {
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/inventory");
}

export async function listExpenses(): Promise<Expense[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("business_id", current.id)
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function sumExpenses(
  from?: string | null,
  to?: string | null,
): Promise<number> {
  const { current } = await getBusinessContext();
  if (!current) return 0;
  const supabase = createAdminClient();
  let query = supabase
    .from("expenses")
    .select("amount")
    .eq("business_id", current.id);
  if (from) query = query.gte("occurred_on", dhakaYmd(from));
  if (to) query = query.lt("occurred_on", dhakaYmd(to));
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (sum, row) => roundMoney(sum + toNumber(row.amount)),
    0,
  );
}

export async function addExpense(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const parsed = parseExpense(
    String(formData.get("amount") ?? ""),
    String(formData.get("occurred_on") ?? ""),
    String(formData.get("category") ?? ""),
    String(formData.get("note") ?? ""),
  );
  if (!parsed.ok) return parsed;

  const supabase = createAdminClient();
  const { error } = await supabase.from("expenses").insert({
    business_id: current.id,
    amount: parsed.amount,
    occurred_on: parsed.occurredOn,
    category: parsed.category,
    note: parsed.note,
  });

  if (error) return { ok: false, message: error.message };
  revalidateExpenses();
  return { ok: true };
}

export async function deleteExpense(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const supabase = createAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("expenses")
    .select("id")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();

  if (lookupError) return { ok: false, message: lookupError.message };
  if (!existing) {
    return { ok: false, message: "That expense does not exist." };
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("business_id", current.id);

  if (error) return { ok: false, message: error.message };
  revalidateExpenses();
  return { ok: true };
}
