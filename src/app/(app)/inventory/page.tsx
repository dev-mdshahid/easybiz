import { getStockPosition } from "@/app/actions";
import { getBusinessContext } from "@/app/business-actions";
import { listInventoryMovements } from "@/app/inventory-actions";
import {
  AdjustmentForm,
  PurchaseForm,
} from "@/components/inventory-forms";
import { InventoryMovementsTable } from "@/components/inventory-movements-table";
import { StockPositionCard } from "@/components/stock-position";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function InventoryPage() {
  const [{ current }, stock, movements] = await Promise.all([
    getBusinessContext(),
    getStockPosition(),
    listInventoryMovements(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Stock on hand is opening stock plus purchases and adjustments, minus
          product cost from Settings. Purchases raise stock and lower cash on
          hand. They are not a profit expense — that is product cost when you
          sell.
        </p>
      </div>

      <StockPositionCard stock={stock} hasBusiness={Boolean(current)} />

      {!current ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a business</CardTitle>
            <CardDescription>
              Create a business from the sidebar before recording stock.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Purchases</CardTitle>
                <CardDescription>
                  Stock you bought on or after the counted-on day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PurchaseForm />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Adjustments</CardTitle>
                <CardDescription>
                  Returns, damage, and count fixes. Pathao returns are not
                  restored automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdjustmentForm />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Movements</CardTitle>
              <CardDescription>Purchases and adjustments for this business</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryMovementsTable rows={movements} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
