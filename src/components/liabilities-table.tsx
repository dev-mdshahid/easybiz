import {
  DeleteLiabilityButton,
  EditLiabilityButton,
  LiabilityRepaymentsButton,
  RepayLiabilityButton,
} from "@/components/liability-form";
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
import type { LiabilityBalance } from "@/app/liability-actions";
import type { LiabilityRepayment } from "@/lib/supabase/database.types";

export function LiabilitiesTable({
  rows,
  repaymentsByLoan,
  cashOnHand,
  lenders,
}: {
  rows: LiabilityBalance[];
  repaymentsByLoan: Record<number, LiabilityRepayment[]>;
  cashOnHand: number | null;
  lenders: string[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No loans yet. Money you borrow for the business is listed here, not on
        Expenses.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Lender</TableHead>
          <TableHead>Note</TableHead>
          <TableHead className="text-right">Principal</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead className="text-right"> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDhakaDay(row.borrowed_on)}
            </TableCell>
            <TableCell>{row.lender}</TableCell>
            <TableCell>{row.note || "—"}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatBdt(row.principal)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.remaining <= 0 ? "Paid" : formatBdt(row.remaining)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex flex-wrap justify-end gap-1">
                <RepayLiabilityButton row={row} cashOnHand={cashOnHand} />
                <LiabilityRepaymentsButton
                  row={row}
                  repayments={repaymentsByLoan[row.id] ?? []}
                />
                <EditLiabilityButton row={row} lenders={lenders} />
                <DeleteLiabilityButton row={row} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
