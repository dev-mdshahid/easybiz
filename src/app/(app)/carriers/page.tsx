import { Suspense } from "react";

import { getBusinessContext } from "@/app/business-actions";
import { getPathaoSettings } from "@/app/pathao-actions";
import { CarriersSkeleton } from "@/components/page-skeletons";
import { PathaoCarrierSettings } from "@/components/pathao-carrier-settings";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

async function CarriersBody() {
  const [{ current }, pathao] = await Promise.all([
    getBusinessContext(),
    getPathaoSettings(),
  ]);

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create a business</CardTitle>
          <CardDescription>
            Create a business from the sidebar before connecting a carrier.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return <PathaoCarrierSettings settings={pathao} />;
}

export default function CarriersPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="page-title">Carriers</h1>
        <p className="text-sm text-muted-foreground">
          Connect courier APIs used to create expected orders. Pathao auto-address
          needs a complete recipient address with locality and district.
        </p>
      </div>
      <Suspense fallback={<CarriersSkeleton />}>
        <CarriersBody />
      </Suspense>
    </div>
  );
}
