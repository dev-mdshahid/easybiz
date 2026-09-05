import { getBusinessContext } from "@/app/business-actions";
import {
  getOrderCreationSettings,
  listExpectedOrders,
} from "@/app/expected-order-actions";
import { getPathaoSettings } from "@/app/pathao-actions";
import { ExpectedOrderIntake } from "@/components/expected-order-intake";
import { ExpectedOrdersFilters } from "@/components/expected-orders-filters";
import { ExpectedOrdersTable } from "@/components/expected-orders-table";
import { ManualExpectedOrderForm } from "@/components/manual-expected-order-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ExpectedOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const [{ current }, settings, pathao, rows] = await Promise.all([
    getBusinessContext(),
    getOrderCreationSettings(),
    getPathaoSettings(),
    listExpectedOrders({ q, status }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Expected orders
        </h1>
        <p className="text-sm text-muted-foreground">
          Build Pathao orders from customer chat screenshots. These are not paid
          invoices — they do not change cash, stock, or profit.
        </p>
      </div>

      {!current ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a business</CardTitle>
            <CardDescription>
              Create a business from the sidebar before extracting orders.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>From screenshots</CardTitle>
              <CardDescription>
                Paste or drop several screenshots at once. Distinct orders are
                saved together; fix anything that still needs review before
                creating them in Pathao.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ExpectedOrderIntake hasApiKey={Boolean(settings?.hasApiKey)} />
              <ManualExpectedOrderForm
                defaultStoreName={settings?.default_store_name ?? ""}
                defaultWeight={settings?.default_item_weight ?? 0.5}
                defaultItemType={settings?.default_item_type ?? "parcel"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved</CardTitle>
              <CardDescription>
                Select ready rows and create them in Pathao. CSV export remains
                as a backup for Merchant bulk upload.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ExpectedOrdersFilters q={q} status={status} />
              <ExpectedOrdersTable
                rows={rows}
                pathaoConnected={Boolean(pathao?.connected)}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
