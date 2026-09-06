"use server";

import { getBusinessContext } from "@/app/business-actions";
import { parseLiability, parseLender, parseRepayment, remainingPrincipal, uniqueLenders } from "@/lib/liability";
import { toNumber } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import type { LiabilityRepayment } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

function revalidateLiabilities() {
  revalidatePath("/");
  revalidatePath("/liabilities");
}

export type LiabilityBalance = {
  id: number;
  business_id: number;
  lender: string;
  borrowed_on: string;
  principal: number;
  channel: string;
  note: string | null;
  created_at: string;
  repaid: number;
  remaining: number;
};

function asLiabilityBalance(row: {
  id: number | null;
  business_id: number | null;
  lender: string | null;
  borrowed_on: string | null;
  principal: number | null;
  channel: string | null;
  note: string | null;
  created_at: string | null;
  repaid: number | null;
  remaining: number | null;
}): LiabilityBalance | null {
  if (
    row.id == null ||
    row.business_id == null ||
    row.lender == null ||
    row.borrowed_on == null ||
    row.principal == null ||
    row.channel == null ||
    row.created_at == null
  ) {
    return null;
  }
  const principal = toNumber(row.principal);
  const repaid = toNumber(row.repaid);
  return {
    id: row.id,
    business_id: row.business_id,
    lender: row.lender,
    borrowed_on: row.borrowed_on.slice(0, 10),
    principal,
    channel: row.channel,
    note: row.note,
    created_at: row.created_at,
    repaid,
    remaining: remainingPrincipal(principal, repaid),
  };
}

export async function listLiabilities(): Promise<LiabilityBalance[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("liabilities_with_balance")
    .select("*")
    .eq("business_id", current.id)
    .order("borrowed_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(asLiabilityBalance)
    .filter((row): row is LiabilityBalance => row != null);
}

export async function listLenders(): Promise<string[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lenders")
    .select("name")
    .eq("business_id", current.id)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return uniqueLenders((data ?? []).map((row) => row.name));
}

async function upsertLender(
  businessId: number,
  name: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("lenders").insert({
    business_id: businessId,
    name,
  });
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: true };
  return { ok: false, message: error.message };
}

export async function addLender(
  formData: FormData,
): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const parsed = parseLender(String(formData.get("lender") ?? ""));
  if (!parsed.ok) return parsed;

  const saved = await upsertLender(current.id, parsed.value);
  if (!saved.ok) return saved;
  revalidateLiabilities();
  return { ok: true, name: parsed.value };
}

export async function listRepayments(): Promise<LiabilityRepayment[]> {
  const { current } = await getBusinessContext();
  if (!current) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("liability_repayments")
    .select("*")
    .eq("business_id", current.id)
    .order("repaid_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function isLoadError(
  value: LiabilityBalance | { ok: false; message: string },
): value is { ok: false; message: string } {
  return "ok" in value && value.ok === false;
}

async function loadLiability(
  id: number,
): Promise<LiabilityBalance | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("liabilities_with_balance")
    .select("*")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  const row = data ? asLiabilityBalance(data) : null;
  if (!row) return { ok: false, message: "That loan does not exist." };
  return row;
}

export async function addLiability(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const parsed = parseLiability(
    String(formData.get("lender") ?? ""),
    String(formData.get("amount") ?? ""),
    String(formData.get("borrowed_on") ?? ""),
    String(formData.get("note") ?? ""),
  );
  if (!parsed.ok) return parsed;

  const saved = await upsertLender(current.id, parsed.lender);
  if (!saved.ok) return saved;

  const supabase = await createClient();
  const { error } = await supabase.from("liabilities").insert({
    business_id: current.id,
    lender: parsed.lender,
    principal: parsed.amount,
    borrowed_on: parsed.borrowedOn,
    channel: "cash",
    note: parsed.note,
  });

  if (error) return { ok: false, message: error.message };
  revalidateLiabilities();
  return { ok: true };
}

export async function updateLiability(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "That loan does not exist." };
  }

  const existing = await loadLiability(id);
  if (isLoadError(existing)) return existing;

  const parsed = parseLiability(
    String(formData.get("lender") ?? ""),
    String(formData.get("amount") ?? ""),
    String(formData.get("borrowed_on") ?? ""),
    String(formData.get("note") ?? ""),
    { minPrincipal: existing.repaid },
  );
  if (!parsed.ok) return parsed;

  const saved = await upsertLender(existing.business_id, parsed.lender);
  if (!saved.ok) return saved;

  const supabase = await createClient();
  const { error } = await supabase
    .from("liabilities")
    .update({
      lender: parsed.lender,
      principal: parsed.amount,
      borrowed_on: parsed.borrowedOn,
      note: parsed.note,
    })
    .eq("id", id)
    .eq("business_id", existing.business_id);

  if (error) return { ok: false, message: error.message };
  revalidateLiabilities();
  return { ok: true };
}

export async function deleteLiability(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await loadLiability(id);
  if (isLoadError(existing)) return existing;

  const supabase = await createClient();
  const { error } = await supabase
    .from("liabilities")
    .delete()
    .eq("id", id)
    .eq("business_id", existing.business_id);

  if (error) return { ok: false, message: error.message };
  revalidateLiabilities();
  return { ok: true };
}

export async function addRepayment(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const liabilityId = Number(formData.get("liability_id"));
  if (!Number.isInteger(liabilityId) || liabilityId <= 0) {
    return { ok: false, message: "That loan does not exist." };
  }

  const loan = await loadLiability(liabilityId);
  if (isLoadError(loan)) return loan;

  const parsed = parseRepayment(
    String(formData.get("amount") ?? ""),
    String(formData.get("repaid_on") ?? ""),
    String(formData.get("note") ?? ""),
    { remaining: loan.remaining, borrowedOn: loan.borrowed_on },
  );
  if (!parsed.ok) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("liability_repayments").insert({
    business_id: loan.business_id,
    liability_id: loan.id,
    amount: parsed.amount,
    repaid_on: parsed.repaidOn,
    channel: "cash",
    note: parsed.note,
  });

  if (error) return { ok: false, message: error.message };
  revalidateLiabilities();
  return { ok: true };
}

export async function updateRepayment(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = Number(formData.get("id"));
  const liabilityId = Number(formData.get("liability_id"));
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(liabilityId) || liabilityId <= 0) {
    return { ok: false, message: "That repayment does not exist." };
  }

  const loan = await loadLiability(liabilityId);
  if (isLoadError(loan)) return loan;

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("liability_repayments")
    .select("id, amount")
    .eq("id", id)
    .eq("liability_id", liabilityId)
    .eq("business_id", loan.business_id)
    .maybeSingle();
  if (lookupError) return { ok: false, message: lookupError.message };
  if (!existing) {
    return { ok: false, message: "That repayment does not exist." };
  }

  const remainingIfRemoved = remainingPrincipal(
    loan.principal,
    loan.repaid - toNumber(existing.amount),
  );
  const parsed = parseRepayment(
    String(formData.get("amount") ?? ""),
    String(formData.get("repaid_on") ?? ""),
    String(formData.get("note") ?? ""),
    { remaining: remainingIfRemoved, borrowedOn: loan.borrowed_on },
  );
  if (!parsed.ok) return parsed;

  const { error } = await supabase
    .from("liability_repayments")
    .update({
      amount: parsed.amount,
      repaid_on: parsed.repaidOn,
      note: parsed.note,
    })
    .eq("id", id)
    .eq("business_id", loan.business_id);

  if (error) return { ok: false, message: error.message };
  revalidateLiabilities();
  return { ok: true };
}

export async function deleteRepayment(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const supabase = await createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("liability_repayments")
    .select("id")
    .eq("id", id)
    .eq("business_id", current.id)
    .maybeSingle();
  if (lookupError) return { ok: false, message: lookupError.message };
  if (!existing) {
    return { ok: false, message: "That repayment does not exist." };
  }

  const { error } = await supabase
    .from("liability_repayments")
    .delete()
    .eq("id", id)
    .eq("business_id", current.id);

  if (error) return { ok: false, message: error.message };
  revalidateLiabilities();
  return { ok: true };
}
