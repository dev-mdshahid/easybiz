import { DeleteExpenseButton } from "@/components/expense-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EXPENSE_CATEGORY_LABELS,
  isExpenseCategory,
} from "@/lib/expense";
import { formatBdt } from "@/lib/money";
import { formatDhakaDay } from "@/lib/time";
import type { Expense } from "@/lib/supabase/database.types";

function toNum(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function categoryLabel(category: string): string {
  return isExpenseCategory(category)
    ? EXPENSE_CATEGORY_LABELS[category]
    : category;
}

export function ExpensesTable({ rows }: { rows: Expense[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No expenses yet. Pathao fees and stock purchases are not listed here.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right"> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDhakaDay(row.occurred_on)}
            </TableCell>
            <TableCell>{categoryLabel(row.category)}</TableCell>
            <TableCell>{row.note || "—"}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatBdt(toNum(row.amount))}
            </TableCell>
            <TableCell className="text-right">
              <DeleteExpenseButton
                id={row.id}
                label={`${categoryLabel(row.category)} on ${row.occurred_on}`}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
