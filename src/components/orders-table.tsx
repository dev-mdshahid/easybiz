import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBdt } from "@/lib/money";
import { formatDhaka } from "@/lib/time";
import type { PathaoInvoice } from "@/lib/supabase/database.types";

function toNum(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

export function OrdersTable({ rows }: { rows: PathaoInvoice[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No invoices match these filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Consignment</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead className="text-right">Collected</TableHead>
          <TableHead className="text-right">Fee</TableHead>
          <TableHead className="text-right">Payout</TableHead>
          <TableHead>Flags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const collected = toNum(row.collected_amount);
          const collectable = toNum(row.collectable_amount);
          const payout = toNum(row.payout);
          const partial = collectable > collected;
          return (
            <TableRow key={row.consignment_id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDhaka(row.created_at)}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.consignment_id}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.merchant_order_id}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{row.recipient_name || "—"}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.recipient_phone}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBdt(collected)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBdt(toNum(row.final_fee))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBdt(payout)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {row.invoice_type === "return" ? (
                    <Badge variant="secondary">Return</Badge>
                  ) : null}
                  {payout < 0 ? (
                    <Badge variant="destructive">Negative payout</Badge>
                  ) : null}
                  {partial ? <Badge variant="outline">Partial</Badge> : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  hrefFor,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        {total} invoices · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="underline-offset-4 hover:underline" href={hrefFor(page - 1)}>
            Previous
          </Link>
        ) : (
          <span className="text-muted-foreground">Previous</span>
        )}
        {page < pages ? (
          <Link className="underline-offset-4 hover:underline" href={hrefFor(page + 1)}>
            Next
          </Link>
        ) : (
          <span className="text-muted-foreground">Next</span>
        )}
      </div>
    </div>
  );
}
