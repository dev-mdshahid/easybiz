"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  discardExpectedOrder,
  exportExpectedOrdersCsv,
  updateExpectedOrder,
} from "@/app/expected-order-actions";
import { ExpectedOrderFields } from "@/components/expected-order-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  asWarningList,
  type ItemType,
} from "@/lib/expected-order";
import { formatBdt, toNumber } from "@/lib/money";
import { formatDhaka } from "@/lib/time";
import type { ExpectedOrder } from "@/lib/supabase/database.types";

function moneyInput(value: number | string): string {
  const n = toNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function statusLabel(status: string): string {
  if (status === "needs_review") return "Needs review";
  if (status === "ready") return "Ready";
  if (status === "exported") return "Exported";
  if (status === "discarded") return "Discarded";
  return status;
}

function statusVariant(
  status: string,
): "secondary" | "default" | "outline" | "destructive" {
  if (status === "ready") return "default";
  if (status === "exported") return "outline";
  if (status === "discarded") return "destructive";
  return "secondary";
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExpectedOrdersTable({ rows }: { rows: ExpectedOrder[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();

  const visibleIds = rows.map((row) => row.id);
  const allChecked =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No expected orders match these filters.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          disabled={pending || selected.length === 0}
          onClick={() => {
            startTransition(async () => {
              const result = await exportExpectedOrdersCsv(selected);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              downloadCsv(result.csv, result.filename);
              setSelected([]);
              const extra =
                result.skippedCount > 0
                  ? ` Skipped ${result.skippedCount} that still need review.`
                  : "";
              toast.success(
                `Exported ${result.exportedCount} order${result.exportedCount === 1 ? "" : "s"} for Pathao.${extra}`,
              );
            });
          }}
        >
          {pending ? "Exporting…" : "Export selected CSV"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Ready and previously exported rows can be uploaded in Pathao Merchant
          → Bulk Order. Rows that need review are skipped.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(event) => {
                  setSelected(event.target.checked ? visibleIds : []);
                }}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Merchant ID</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">COD</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const warnings = asWarningList(row.warnings);
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={(event) => {
                      setSelected((current) =>
                        event.target.checked
                          ? [...current, row.id]
                          : current.filter((id) => id !== row.id),
                      );
                    }}
                    aria-label={`Select ${row.merchant_order_id || row.id}`}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDhaka(row.created_at)}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {row.merchant_order_id || "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{row.recipient_name || "—"}</span>
                    <span className="text-xs text-muted-foreground">
                      {row.recipient_phone || "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>
                      {[row.recipient_city, row.recipient_zone]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                    <span className="max-w-56 truncate text-xs text-muted-foreground">
                      {row.recipient_address || "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatBdt(toNumber(row.amount_to_collect))}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={statusVariant(row.status)}>
                      {statusLabel(row.status)}
                    </Badge>
                    {warnings.length > 0 ? (
                      <span className="max-w-48 text-xs text-muted-foreground">
                        {warnings[0]}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {row.status !== "discarded" ? (
                    <div className="flex justify-end gap-1">
                      <EditExpectedOrderButton row={row} />
                      <DiscardExpectedOrderButton id={row.id} />
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function EditExpectedOrderButton({ row }: { row: ExpectedOrder }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [itemType, setItemType] = useState<ItemType>(
    row.item_type === "document" ? "document" : "parcel",
  );
  const warnings = asWarningList(row.warnings);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setItemType(row.item_type === "document" ? "document" : "parcel");
          setOpen(true);
        }}
      >
        Edit
      </Button>
      {open ? (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!pending) setOpen(next);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <form
              className="grid gap-4"
              action={(formData) => {
                formData.set("id", String(row.id));
                startTransition(async () => {
                  const result = await updateExpectedOrder(formData);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Expected order updated");
                  setOpen(false);
                });
              }}
            >
              <DialogHeader>
                <DialogTitle>Edit expected order</DialogTitle>
                <DialogDescription>
                  City and zone must match Pathao names (for example Dhaka /
                  Uttara) or the row stays in review and will not export.
                </DialogDescription>
              </DialogHeader>
              {warnings.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <ExpectedOrderFields
                idPrefix={`edit-${row.id}`}
                itemType={itemType}
                onItemTypeChange={setItemType}
                values={{
                  recipient_name: row.recipient_name,
                  recipient_phone: row.recipient_phone,
                  recipient_address: row.recipient_address,
                  recipient_city: row.recipient_city,
                  recipient_zone: row.recipient_zone,
                  recipient_area: row.recipient_area,
                  amount_to_collect: moneyInput(row.amount_to_collect),
                  item_quantity: String(row.item_quantity),
                  item_weight: moneyInput(row.item_weight),
                  item_desc: row.item_desc,
                  special_instruction: row.special_instruction,
                  store_name: row.store_name,
                }}
              />
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function DiscardExpectedOrderButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await discardExpectedOrder(id);
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success("Expected order discarded");
        });
      }}
    >
      {pending ? "…" : "Discard"}
    </Button>
  );
}
