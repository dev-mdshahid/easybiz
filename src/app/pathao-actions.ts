"use server";

import { revalidatePath } from "next/cache";

import { getBusinessContext } from "@/app/business-actions";
import {
  createPathaoOrder,
  getPathaoStores,
  getPathaoUser,
  isEligibleForPathaoCreate,
  isPathaoEnvironment,
  PathaoApiError,
  type PathaoCredentials,
  type PathaoEnvironment,
  type PathaoStore,
  type PathaoTokens,
} from "@/lib/pathao-api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessSettings } from "@/lib/supabase/database.types";

function revalidatePathao() {
  revalidatePath("/carriers");
  revalidatePath("/expected-orders");
}

export type PublicPathaoSettings = {
  environment: PathaoEnvironment;
  clientId: string;
  username: string;
  hasClientSecret: boolean;
  hasPassword: boolean;
  clientSecretHint: string;
  passwordHint: string;
  storeId: number | null;
  storeName: string;
  deliveryType: number;
  connectedAt: string | null;
  connected: boolean;
};

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`;
}

function toPublic(row: BusinessSettings | null): PublicPathaoSettings {
  const secret = row?.pathao_client_secret ?? "";
  const password = row?.pathao_password ?? "";
  const environmentRaw = row?.pathao_environment ?? "";
  const environment: PathaoEnvironment = isPathaoEnvironment(environmentRaw)
    ? environmentRaw
    : "production";
  const storeId = row?.pathao_store_id ?? null;
  return {
    environment,
    clientId: row?.pathao_client_id ?? "",
    username: row?.pathao_username ?? "",
    hasClientSecret: secret.trim().length > 0,
    hasPassword: password.trim().length > 0,
    clientSecretHint: maskSecret(secret),
    passwordHint: maskSecret(password),
    storeId,
    storeName: row?.pathao_store_name ?? "",
    deliveryType: row?.pathao_delivery_type === 12 ? 12 : 48,
    connectedAt: row?.pathao_connected_at ?? null,
    connected: Boolean(
      secret.trim() &&
        password.trim() &&
        (row?.pathao_client_id ?? "").trim() &&
        (row?.pathao_username ?? "").trim() &&
        storeId,
    ),
  };
}

async function loadSettingsRow(businessId: number): Promise<BusinessSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function credentialsFrom(
  row: BusinessSettings | null,
  overrides?: Partial<PathaoCredentials>,
): PathaoCredentials | { error: string } {
  const environmentRaw = overrides?.environment ?? row?.pathao_environment ?? "production";
  if (!isPathaoEnvironment(environmentRaw)) {
    return { error: "Choose sandbox or production." };
  }
  const clientId = (overrides?.clientId ?? row?.pathao_client_id ?? "").trim();
  const clientSecret = (overrides?.clientSecret ?? row?.pathao_client_secret ?? "").trim();
  const username = (overrides?.username ?? row?.pathao_username ?? "").trim();
  const password = (overrides?.password ?? row?.pathao_password ?? "").trim();
  if (!clientId || !clientSecret || !username || !password) {
    return { error: "Enter Pathao client id, secret, username, and password." };
  }
  return { environment: environmentRaw, clientId, clientSecret, username, password };
}

function tokensFromRow(row: BusinessSettings | null): PathaoTokens | null {
  const accessToken = row?.pathao_access_token?.trim() ?? "";
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: row?.pathao_refresh_token ?? "",
    expiresAt: row?.pathao_token_expires_at ?? "",
  };
}

async function persistPathao(
  businessId: number,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("business_settings").upsert(
    {
      business_id: businessId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(error.message);
}

export async function getPathaoSettings(): Promise<PublicPathaoSettings | null> {
  const { current } = await getBusinessContext();
  if (!current) return null;
  return toPublic(await loadSettingsRow(current.id));
}

export async function savePathaoSettings(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const existing = await loadSettingsRow(current.id);
  const environmentRaw = String(formData.get("pathao_environment") ?? "");
  if (!isPathaoEnvironment(environmentRaw)) {
    return { ok: false, message: "Choose sandbox or production." };
  }
  const clientId = String(formData.get("pathao_client_id") ?? "").trim();
  const username = String(formData.get("pathao_username") ?? "").trim();
  const incomingSecret = String(formData.get("pathao_client_secret") ?? "");
  const incomingPassword = String(formData.get("pathao_password") ?? "");
  const clientSecret = incomingSecret.trim()
    ? incomingSecret.trim()
    : (existing?.pathao_client_secret ?? "");
  const password = incomingPassword.trim()
    ? incomingPassword.trim()
    : (existing?.pathao_password ?? "");
  const storeIdRaw = Number(String(formData.get("pathao_store_id") ?? ""));
  const storeName = String(formData.get("pathao_store_name") ?? "").trim();
  const deliveryType = String(formData.get("pathao_delivery_type") ?? "48") === "12" ? 12 : 48;

  if (!clientId || !username) {
    return { ok: false, message: "Client id and username are required." };
  }
  if (!clientSecret || !password) {
    return { ok: false, message: "Client secret and password are required." };
  }
  if (!Number.isInteger(storeIdRaw) || storeIdRaw <= 0) {
    return { ok: false, message: "Test the connection and choose a Pathao store." };
  }

  try {
    await persistPathao(current.id, {
      pathao_environment: environmentRaw,
      pathao_client_id: clientId,
      pathao_client_secret: clientSecret,
      pathao_username: username,
      pathao_password: password,
      pathao_store_id: storeIdRaw,
      pathao_store_name: storeName,
      pathao_delivery_type: deliveryType,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save Pathao settings.",
    };
  }
  revalidatePathao();
  return { ok: true };
}

export async function testPathaoConnection(
  formData: FormData,
): Promise<
  | {
      ok: true;
      merchant: string;
      stores: PathaoStore[];
    }
  | { ok: false; message: string }
> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const existing = await loadSettingsRow(current.id);
  const environmentRaw = String(formData.get("pathao_environment") ?? "");
  const incomingSecret = String(formData.get("pathao_client_secret") ?? "");
  const incomingPassword = String(formData.get("pathao_password") ?? "");
  const credentials = credentialsFrom(existing, {
    environment: isPathaoEnvironment(environmentRaw) ? environmentRaw : undefined,
    clientId: String(formData.get("pathao_client_id") ?? ""),
    clientSecret: incomingSecret.trim() ? incomingSecret.trim() : undefined,
    username: String(formData.get("pathao_username") ?? ""),
    password: incomingPassword.trim() ? incomingPassword.trim() : undefined,
  });
  if ("error" in credentials) return { ok: false, message: credentials.error };

  try {
    const { stores, tokens } = await getPathaoStores(
      credentials,
      tokensFromRow(existing),
    );
    const active = stores.filter((store) => store.is_active !== 0 && store.is_active !== false);
    const listed = active.length > 0 ? active : stores;
    let merchant =
      listed.find((store) => store.store_name.trim())?.store_name.trim() ||
      credentials.username;
    try {
      const user = await getPathaoUser(credentials, tokens);
      if (user.name.trim()) merchant = user.name.trim();
    } catch {
      // short-info is not in the public merchant docs; stores are enough
    }
    await persistPathao(current.id, {
      pathao_environment: credentials.environment,
      pathao_client_id: credentials.clientId,
      pathao_client_secret: credentials.clientSecret,
      pathao_username: credentials.username,
      pathao_password: credentials.password,
      pathao_access_token: tokens.accessToken,
      pathao_refresh_token: tokens.refreshToken,
      pathao_token_expires_at: tokens.expiresAt,
      pathao_connected_at: new Date().toISOString(),
    });
    revalidatePathao();
    return { ok: true, merchant, stores: listed };
  } catch (error) {
    const message =
      error instanceof PathaoApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not connect to Pathao.";
    return { ok: false, message };
  }
}

export async function createExpectedOrdersInPathao(ids: number[]): Promise<
  | {
      ok: true;
      createdCount: number;
      failedCount: number;
      skippedCount: number;
      failures: { id: number; merchantOrderId: string; message: string }[];
    }
  | { ok: false; message: string }
> {
  const { current } = await getBusinessContext();
  if (!current) {
    return { ok: false, message: "Create a business before continuing." };
  }

  const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  if (unique.length === 0) {
    return { ok: false, message: "Select at least one order to create in Pathao." };
  }

  const settings = await loadSettingsRow(current.id);
  const credentials = credentialsFrom(settings);
  if ("error" in credentials) {
    return { ok: false, message: `${credentials.error} Open Carriers to connect Pathao.` };
  }
  const storeId = settings?.pathao_store_id ?? null;
  if (!storeId) {
    return { ok: false, message: "Choose a Pathao store on the Carriers page first." };
  }
  const deliveryType = settings?.pathao_delivery_type === 12 ? 12 : 48;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expected_orders")
    .select("*")
    .eq("business_id", current.id)
    .in("id", unique);
  if (error) return { ok: false, message: error.message };

  const rows = data ?? [];
  const eligible = rows.filter((row) => isEligibleForPathaoCreate(row));
  const skippedCount = rows.length - eligible.length;
  if (eligible.length === 0) {
    return {
      ok: false,
      message:
        skippedCount > 0
          ? "Selected orders are not ready, were discarded, or are already in Pathao."
          : "Those orders were not found.",
    };
  }

  let tokens = tokensFromRow(settings);
  let createdCount = 0;
  let failedCount = 0;
  const failures: { id: number; merchantOrderId: string; message: string }[] = [];

  for (const row of eligible) {
    const now = new Date().toISOString();
    try {
      const result = await createPathaoOrder(credentials, tokens, {
        store_id: storeId,
        merchant_order_id: row.merchant_order_id || `EB-${row.id}`,
        recipient_name: row.recipient_name,
        recipient_phone: row.recipient_phone,
        recipient_address: row.recipient_address,
        delivery_type: deliveryType,
        item_type: row.item_type === "document" ? "document" : "parcel",
        item_quantity: row.item_quantity,
        item_weight: Number(row.item_weight),
        amount_to_collect: Number(row.amount_to_collect),
        item_description: row.item_desc,
        special_instruction: row.special_instruction,
      });
      tokens = result.tokens;
      await persistPathao(current.id, {
        pathao_access_token: tokens.accessToken,
        pathao_refresh_token: tokens.refreshToken,
        pathao_token_expires_at: tokens.expiresAt,
      });
      const { error: updateError } = await supabase
        .from("expected_orders")
        .update({
          status: "created",
          pathao_consignment_id: result.order.consignment_id,
          pathao_delivery_fee: result.order.delivery_fee,
          pathao_submitted_at: now,
          pathao_error: "",
          updated_at: now,
        })
        .eq("id", row.id)
        .eq("business_id", current.id);
      if (updateError) throw new Error(updateError.message);
      createdCount += 1;
    } catch (caught) {
      failedCount += 1;
      const message =
        caught instanceof PathaoApiError
          ? caught.message
          : caught instanceof Error
            ? caught.message
            : "Pathao create failed.";
      failures.push({
        id: row.id,
        merchantOrderId: row.merchant_order_id || `EB-${row.id}`,
        message,
      });
      await supabase
        .from("expected_orders")
        .update({
          status: "failed",
          pathao_error: message,
          updated_at: now,
        })
        .eq("id", row.id)
        .eq("business_id", current.id);
    }
  }

  revalidatePathao();
  return { ok: true, createdCount, failedCount, skippedCount, failures };
}
