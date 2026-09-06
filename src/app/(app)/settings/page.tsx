import { Suspense } from "react";

import { getBusinessContext } from "@/app/business-actions";
import { getOrderCreationSettings } from "@/app/expected-order-actions";
import { listProductsWithLines } from "@/app/settings-actions";
import { OrderCreationSettings } from "@/components/order-creation-settings";
import { SettingsSkeleton } from "@/components/page-skeletons";
import { SettingsClient } from "@/components/settings-client";

async function SettingsBody({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const params = await searchParams;
  const [{ current }, products, orderSettings] = await Promise.all([
    getBusinessContext(),
    listProductsWithLines(),
    getOrderCreationSettings(),
  ]);
  const requested = Number(params.product);
  const selected =
    products.find((product) => product.id === requested) ??
    products.find((product) => product.is_default) ??
    products[0];

  return (
    <>
      {current ? <OrderCreationSettings settings={orderSettings} /> : null}
      <SettingsClient products={products} selectedId={selected?.id ?? null} />
    </>
  );
}

export default function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          How each Pathao order splits into net payout, after costs, product cost,
          and profit. Orders use the default item. Create a business from the
          sidebar before editing item costs.
        </p>
      </div>
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
