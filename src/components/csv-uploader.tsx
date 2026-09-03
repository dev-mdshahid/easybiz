"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { importPathaoCsv, previewPathaoCsv } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBdt } from "@/lib/money";
import type { PathaoInvoiceParsed } from "@/lib/pathao-csv";

type PreviewState = {
  preview: PathaoInvoiceParsed[];
  rowCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
};

type ImportState = {
  filename: string;
  rowCount: number;
  insertedCount: number;
  updatedCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
};

export function CsvUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [imported, setImported] = useState<ImportState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setImported(null);
    setMessage(null);
    if (!next) return;

    const form = new FormData();
    form.set("file", next);
    startTransition(async () => {
      const result = await previewPathaoCsv(form);
      if (!result.ok) {
        setMessage(result.message);
        toast.error(result.message);
        return;
      }
      setPreview(result);
    });
  }

  function confirm() {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    startTransition(async () => {
      const result = await importPathaoCsv(form);
      if (!result.ok) {
        setMessage(result.message);
        toast.error(result.message);
        return;
      }
      setImported(result);
      toast.success(
        `Saved ${result.insertedCount} new, updated ${result.updatedCount}`,
      );
    });
  }

  return (
    <div className="grid gap-6">
      <label
        htmlFor="csv"
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center"
      >
        <span className="text-sm font-medium">Drop a Pathao paid-invoice CSV</span>
        <span className="mt-1 text-xs text-muted-foreground">
          Daily Pathao merchant export · max 5 MB
        </span>
        <input
          id="csv"
          type="file"
          accept=".csv,text/csv"
          className="mt-4 text-sm"
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </label>

      {message ? (
        <Alert variant="destructive">
          <AlertTitle>Could not read file</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      {preview ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {preview.rowCount} valid rows
              {preview.errorCount > 0
                ? ` · ${preview.errorCount} row errors will be skipped`
                : ""}
              . Showing the first {preview.preview.length}.
            </p>
            <Button onClick={confirm} disabled={pending || !file}>
              {pending ? "Working…" : "Save invoices"}
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consignment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead className="text-right">Collected</TableHead>
                <TableHead className="text-right">Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.preview.map((row) => (
                <TableRow key={row.consignment_id}>
                  <TableCell className="font-mono text-xs">
                    {row.consignment_id}
                  </TableCell>
                  <TableCell>{row.invoice_type}</TableCell>
                  <TableCell>{row.recipient_name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBdt(row.collected_amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBdt(row.payout)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {preview.errors.length > 0 ? (
            <Alert>
              <AlertTitle>Row errors</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {preview.errors.map((error) => (
                    <li key={`${error.row}-${error.message}`}>
                      Line {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      {imported ? (
        <Alert>
          <AlertTitle>Import complete</AlertTitle>
          <AlertDescription>
            {imported.filename}: {imported.insertedCount} inserted,{" "}
            {imported.updatedCount} updated
            {imported.errorCount > 0 ? `, ${imported.errorCount} skipped` : ""}.
            Re-upload the same consignments to refresh amounts.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
