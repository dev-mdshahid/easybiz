"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCsvUpload } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDhaka } from "@/lib/time";
import type { CsvUpload } from "@/lib/supabase/database.types";

function deleteSummary(result: {
  removedCount: number;
  revertedCount: number;
  keptCount: number;
}): string {
  const parts: string[] = [];
  if (result.removedCount > 0) {
    parts.push(
      `${result.removedCount} order${result.removedCount === 1 ? "" : "s"} removed`,
    );
  }
  if (result.revertedCount > 0) {
    parts.push(
      `${result.revertedCount} reverted to the previous file`,
    );
  }
  if (result.keptCount > 0) {
    parts.push(
      `${result.keptCount} kept from a newer file`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : "No orders were attached to this file";
}

export function UploadHistory({ uploads }: { uploads: CsvUpload[] }) {
  const [pending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<CsvUpload | null>(null);

  function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    startTransition(async () => {
      const result = await deleteCsvUpload(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setPendingDelete(null);
      toast.success(`${result.filename} deleted`, {
        description: deleteSummary(result),
      });
    });
  }

  if (uploads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing imported yet.</p>
    );
  }

  return (
    <>
      <ul className="grid gap-2 text-sm">
        {uploads.map((upload) => (
          <li
            key={upload.id}
            className="flex flex-wrap items-start justify-between gap-2 border-b border-border py-2 last:border-0"
          >
            <div className="min-w-0">
              <p className="font-medium">{upload.filename}</p>
              <p className="text-xs text-muted-foreground">
                {upload.status} · {upload.inserted_count} new ·{" "}
                {upload.updated_count} updated · {upload.error_count} skipped
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {formatDhaka(upload.created_at)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${upload.filename}`}
                disabled={pending}
                onClick={() => setPendingDelete(upload)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {pendingDelete ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !pending) setPendingDelete(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {pendingDelete.filename}?</DialogTitle>
              <DialogDescription>
                Orders that only exist in this file will be removed. If this file
                overwrote an older one, those orders revert to the previous
                amounts. If a newer file already updated the same consignment,
                that newer data stays. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={pending} />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={confirmDelete}
              >
                {pending ? "Deleting…" : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
