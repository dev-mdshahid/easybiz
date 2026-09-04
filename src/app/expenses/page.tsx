import { getBusinessContext } from "@/app/business-actions";
import { listExpenses } from "@/app/expense-actions";
import { ExpenseForm } from "@/components/expense-form";
import { ExpensesTable } from "@/components/expenses-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ExpensesPage() {
  const [{ current }, expenses] = await Promise.all([
    getBusinessContext(),
    listExpenses(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
        <p className="text-sm text-muted-foreground">
          Cash you spent besides stock. Each entry lowers cash on hand (on or
          after the counted-on day) and period profit. Recipe packaging and
          marketing in Settings are estimates — do not enter the same spend
          here unless you mean to.
        </p>
      </div>

      {!current ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a business</CardTitle>
            <CardDescription>
              Create a business from the sidebar before recording expenses.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add expense</CardTitle>
              <CardDescription>
                Rent, ads, salary, and other cash leaving the business. Buy
                stock on Inventory instead.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recorded</CardTitle>
              <CardDescription>Expenses for this business</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpensesTable rows={expenses} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
