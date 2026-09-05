"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { extractExpectedOrders } from "@/app/expected-order-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  EXPECTED_ORDER_MAX_QUEUE,
  clampScreenshotBatchSize,
  planScreenshotBatches,
} from "@/lib/expected-order";

type Preview = { id: string; file: File; url: string };
type QueueOrder = {
  id: number;
  recipient_phone: string;
  amount_to_collect: number;
  status: string;
};

async function resizeToJpeg(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/jpeg", 0.82);
  });
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

function mergeQueueOrders(current: QueueOrder[], incoming: QueueOrder[]): QueueOrder[] {
  const map = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) map.set(row.id, row);
  return [...map.values()];
}

export function ExpectedOrderIntake({
  hasApiKey,
  batchSize,
}: {
  hasApiKey: boolean;
  batchSize: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queueIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `queue-${Date.now()}`,
  );
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [processedCount, setProcessedCount] = useState(0);
  const [lockedBatchSize, setLockedBatchSize] = useState<number | null>(null);
  const [queueOrders, setQueueOrders] = useState<QueueOrder[]>([]);

  const size = lockedBatchSize ?? clampScreenshotBatchSize(batchSize);
  const batches = useMemo(
    () => planScreenshotBatches({ imageCount: previews.length, batchSize: size }),
    [previews.length, size],
  );
  const currentBatch =
    batches.find((batch) => batch.newStart === processedCount) ?? null;
  const remaining = Math.max(0, previews.length - processedCount);
  const multiBatch = batches.length > 1;
  const currentIndex = currentBatch
    ? batches.findIndex((batch) => batch.newStart === currentBatch.newStart) + 1
    : 0;

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setPreviews((current) => {
      const room = EXPECTED_ORDER_MAX_QUEUE - current.length;
      if (images.length > room) {
        toast.error(
          room <= 0
            ? `Remove screenshots first. ${EXPECTED_ORDER_MAX_QUEUE} is the maximum in the queue.`
            : `At most ${EXPECTED_ORDER_MAX_QUEUE} screenshots in the queue. Extra files were not added.`,
        );
      }
      if (room <= 0) return current;
      const next = images.slice(0, room).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      }));
      return [...current, ...next];
    });
  }, []);

  function clearQueue() {
    setPreviews((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return [];
    });
    setProcessedCount(0);
    setLockedBatchSize(null);
    setQueueOrders([]);
    queueIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `queue-${Date.now()}`;
  }

  useEffect(() => {
    if (remaining === 0) return;
    function onLeave(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [remaining]);

  return (
    <div className="grid gap-3">
      {!hasApiKey ? (
        <p className="text-sm text-destructive">
          Add an AI API key in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          before extracting from screenshots. You can still add an order
          manually below.
        </p>
      ) : null}
      <div
        className="grid gap-2 rounded-lg border border-dashed border-border p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles([...event.dataTransfer.files]);
        }}
        onPaste={(event) => {
          const files = [...event.clipboardData.items]
            .map((item) => item.getAsFile())
            .filter((file): file is File => file != null);
          addFiles(files);
        }}
      >
        <p className="text-sm">
          Paste chat screenshots (Ctrl+V), drop files, or browse. All images in
          a batch are read together: several orders can sit in one screenshot,
          and one order can continue across the next.
        </p>
        <p className="text-xs text-muted-foreground">
          {previews.length} queued
          {multiBatch
            ? ` · batch ${Math.max(currentIndex, 1)} of ${batches.length}`
            : ""}
          {` · ${size} per extract`}
        </p>
        <div className="flex flex-wrap gap-2">
          {previews.map((item, index) => {
            const processed = index < processedCount;
            const inCurrent =
              currentBatch != null &&
              index >= currentBatch.start &&
              index < currentBatch.end;
            const context =
              inCurrent && currentBatch != null && index < currentBatch.newStart;
            return (
              <button
                key={item.id}
                type="button"
                className={`relative size-20 overflow-hidden rounded-md border ${
                  processed
                    ? "border-border opacity-50"
                    : context
                      ? "border-ring ring-2 ring-ring/40"
                      : inCurrent
                        ? "border-foreground"
                        : "border-border"
                }`}
                onClick={() => {
                  if (index < processedCount) return;
                  URL.revokeObjectURL(item.url);
                  setPreviews((current) => current.filter((row) => row.id !== item.id));
                }}
                aria-label={
                  processed ? "Processed screenshot" : "Remove screenshot"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="size-full object-cover" />
              </button>
            );
          })}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles([...(event.target.files ?? [])]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Browse screenshots
          </Button>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="extract-note">Note (optional)</Label>
        <Textarea
          id="extract-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything the screenshots miss — COD, zone, product…"
        />
      </div>
      <div>
        <Button
          type="button"
          disabled={pending || !hasApiKey || currentBatch == null}
          onClick={() => {
            const batch = currentBatch;
            if (!batch) return;
            const slice = previews.slice(batch.start, batch.end);
            const total = previews.length;
            const priorIds = queueOrders.map((row) => String(row.id)).join(",");
            startTransition(async () => {
              setLockedBatchSize(size);
              const form = new FormData();
              if (note.trim()) form.set("note", note.trim());
              form.set("queue_id", queueIdRef.current);
              if (priorIds) form.set("queue_prior_ids", priorIds);
              for (const item of slice) {
                form.append("images", await resizeToJpeg(item.file));
              }
              const result = await extractExpectedOrders(form);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              const lastBatch = batch.end >= total;
              if (result.empty) {
                toast.message(
                  lastBatch || !multiBatch
                    ? "No orders found in those screenshots."
                    : "No orders in this batch.",
                );
              } else if (result.orders.length === 0) {
                toast.message(
                  lastBatch || !multiBatch
                    ? "No new orders from those screenshots."
                    : "No new orders from this batch.",
                );
              } else {
                toast.success(
                  result.orders.length === 1
                    ? "Saved 1 expected order"
                    : `Saved ${result.orders.length} expected orders`,
                );
              }
              setQueueOrders((current) =>
                mergeQueueOrders(
                  current,
                  result.ok
                    ? result.orders.map((row) => ({
                        id: row.id,
                        recipient_phone: row.recipient_phone,
                        amount_to_collect: Number(row.amount_to_collect) || 0,
                        status: row.status,
                      }))
                    : [],
                ),
              );
              if (lastBatch) {
                setNote("");
                clearQueue();
                return;
              }
              setProcessedCount(batch.end);
            });
          }}
        >
          {pending
            ? "Extracting…"
            : !multiBatch
              ? "Extract and save orders"
              : currentIndex <= 1
                ? `Extract batch 1 of ${batches.length}`
                : `Extract next batch (${currentIndex} of ${batches.length})`}
        </Button>
      </div>
    </div>
  );
}