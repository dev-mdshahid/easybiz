"use server";

import { redirect } from "next/navigation";

import { isLegacyOwnerEmail } from "@/lib/auth";
import { safeNextPath } from "@/lib/auth-session";
import { clearBusinessCookie } from "@/lib/business-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { ok: true } | { ok: false; message: string };

const GENERIC_SIGN_IN = "Email or password is incorrect.";
const GENERIC_SIGN_UP = "Could not create the account.";
const MIN_PASSWORD = 8;

async function claimLegacyBusinesses(userId: string, email: string | undefined) {
  if (!email || !isLegacyOwnerEmail(email)) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({ owner_id: userId })
    .is("owner_id", null);
  if (error) {
    throw new Error(error.message);
  }
}

export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }
  return data.user.id;
}

export async function getSessionEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, message: "Enter your email and password." };
  }

  await clearBusinessCookie();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { ok: false, message: GENERIC_SIGN_IN };
  }

  await claimLegacyBusinesses(data.user.id, data.user.email);
  redirect(safeNextPath(String(formData.get("next") ?? "")));
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, message: "Enter an email and password." };
  }
  if (password.length < MIN_PASSWORD) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }

  await clearBusinessCookie();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    return { ok: false, message: GENERIC_SIGN_UP };
  }

  if (!data.session) {
    return { ok: true };
  }

  await claimLegacyBusinesses(data.user.id, data.user.email);
  redirect("/");
}

export async function signOut() {
  await clearBusinessCookie();
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

export async function requestPasswordReset(
  formData: FormData,
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { ok: false, message: "Enter your email." };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/update-password`,
  });
  return { ok: true };
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, message: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    return { ok: false, message: "Open the reset link from your email first." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: "Could not update the password." };
  }
  redirect("/");
}
