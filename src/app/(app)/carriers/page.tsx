import { getBusinessContext } from "@/app/business-actions";
import { getPathaoSettings } from "@/app/pathao-actions";
import { PathaoCarrierSettings } from "@/components/pathao-carrier-settings";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function CarriersPage() {
  const [{ current }, pathao] = await Promise.all([
    getBusinessContext(),
    getPathaoSettings(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Carriers</h1>
        <p className="text-sm text-muted-foreground">
          Connect courier APIs used to create expected orders. Pathao auto-address
          needs a complete recipient address with locality and district.
        </p>
      </div>
      {!current ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a business</CardTitle>
            <CardDescription>
              Create a business from the sidebar before connecting a carrier.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <PathaoCarrierSettings settings={pathao} />
      )}
    </div>
  );
}
