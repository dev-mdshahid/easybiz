"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { parseOpeningBalanceFields } from "@/lib/opening-balance";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Business } from "@/lib/supabase/database.types";

const BUSINESS_COOKIE = "easybiz_business_id";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

function revalidateBooks() {
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/upload");
}

export async function listBusinesses(): Promise<Business[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getBusinessContext(): Promise<{
  businesses: Business[];
  current: Business | null;
}> {
  const businesses = await listBusinesses();
  if (businesses.length === 0) return { businesses, current: null };

  const store = await cookies();
  const raw = store.get(BUSINESS_COOKIE)?.value;
  const cookieId = raw ? Number(raw) : NaN;
  const current =
    businesses.find((business) => business.id === cookieId) ?? businesses[0];

  return { businesses, current };
}

export async function requireBusiness(): Promise<Business> {
  const { current } = await getBusinessContext();
  if (!current) {
    throw new Error("Create a business before continuing.");
  }
  return current;
}

export async function setCurrentBusiness(id: number) {
  const businesses = await listBusinesses();
  const match = businesses.find((business) => business.id === id);
  if (!match) throw new Error("That business does not exist.");

  const store = await cookies();
  store.set(BUSINESS_COOKIE, String(match.id), cookieOptions());
  revalidateBooks();
}

export async function createBusiness(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { ok: false, message: "Enter a business name." };
  }

  const opening = parseOpeningBalanceFields(
    String(formData.get("opening_balance") ?? ""),
    String(formData.get("opening_balance_on") ?? ""),
    { allowSkip: true },
  );
  if (!opening.ok) {
    return { ok: false, message: opening.message };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      name,
      ...(opening.skipped
        ? {}
        : {
            opening_balance: opening.amount,
            opening_balance_on: opening.on,
          }),
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "Could not create the business." };
  }

  const store = await cookies();
  store.set(BUSINESS_COOKIE, String(data.id), cookieOptions());
  revalidateBooks();
  return { ok: true };
}

export async function deleteBusiness(
  id: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createAdminClient();
  const { data: existing, error: lookupError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, message: lookupError.message };
  }
  if (!existing) {
    return { ok: false, message: "That business does not exist." };
  }

  const { error } = await supabase.from("businesses").delete().eq("id", id);
  if (error) {
    return { ok: false, message: error.message };
  }

  const remaining = await listBusinesses();
  const store = await cookies();
  const raw = store.get(BUSINESS_COOKIE)?.value;
  const cookieId = raw ? Number(raw) : NaN;
  const cookieStillValid = remaining.some((business) => business.id === cookieId);

  if (!cookieStillValid) {
    const next = remaining[0];
    if (next) {
      store.set(BUSINESS_COOKIE, String(next.id), cookieOptions());
    } else {
      store.set(BUSINESS_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    }
  }

  revalidateBooks();
  return { ok: true };
}

export async function updateOpeningBalance(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const opening = parseOpeningBalanceFields(
    String(formData.get("opening_balance") ?? ""),
    String(formData.get("opening_balance_on") ?? ""),
    { allowSkip: false },
  );
  if (!opening.ok) {
    return { ok: false, message: opening.message };
  }
  if (opening.skipped) {
    return { ok: false, message: "Enter an opening amount and date." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      opening_balance: opening.amount,
      opening_balance_on: opening.on,
    })
    .eq("id", current.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateBooks();
  return { ok: true };
}
