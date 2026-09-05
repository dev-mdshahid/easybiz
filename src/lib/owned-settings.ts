import { requireUserId } from "@/app/auth-actions";
import { getBusinessContext } from "@/app/business-actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessSettings } from "@/lib/supabase/database.types";

async function assertOwnsBusiness(businessId: number) {
  await requireUserId();
  const { businesses } = await getBusinessContext();
  if (!businesses.some((business) => business.id === businessId)) {
    throw new Error("Business not found.");
  }
}

export async function loadOwnedBusinessSettings(
  businessId: number,
): Promise<BusinessSettings | null> {
  await assertOwnsBusiness(businessId);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("business_settings")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function persistOwnedBusinessSettings(
  businessId: number,
  patch: Record<string, unknown>,
): Promise<void> {
  await assertOwnsBusiness(businessId);
  const admin = createAdminClient();
  const { error } = await admin.from("business_settings").upsert(
    {
      business_id: businessId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) throw new Error(error.message);
}
