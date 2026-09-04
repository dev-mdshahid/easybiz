import { DeleteMovementButton } from "@/components/inventory-forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBdt } from "@/lib/money";
import { formatDhakaDay } from "@/lib/time";
import type { InventoryMovement } from "@/lib/supabase/database.types";

function toNum(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function InventoryMovementsTable({
  rows,
}: {
  rows: InventoryMovement[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No purchases or adjustments yet. Opening stock and Pathao COGS are not
        listed here.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
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
            <TableCell className="capitalize">{row.kind}</TableCell>
            <TableCell>{row.note || "—"}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatBdt(toNum(row.amount))}
            </TableCell>
            <TableCell className="text-right">
              <DeleteMovementButton
                id={row.id}
                label={`${row.kind} on ${row.occurred_on}`}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
