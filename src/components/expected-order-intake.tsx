"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { extractExpectedOrders } from "@/app/expected-order-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_IMAGES = 8;

type Preview = { id: string; file: File; url: string };

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

export function ExpectedOrderIntake({ hasApiKey }: { hasApiKey: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;
    setPreviews((current) => {
      const room = MAX_IMAGES - current.length;
      const next = images.slice(0, Math.max(0, room)).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      }));
      return [...current, ...next];
    });
  }, []);

  function clearPreviews() {
    setPreviews((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return [];
    });
  }

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
          Paste a chat screenshot (Ctrl+V), drop files, or browse. Several
          screenshots of the same conversation can go together.
        </p>
        <div className="flex flex-wrap gap-2">
          {previews.map((item) => (
            <button
              key={item.id}
              type="button"
              className="relative size-20 overflow-hidden rounded-md border border-border"
              onClick={() => {
                URL.revokeObjectURL(item.url);
                setPreviews((current) =>
                  current.filter((row) => row.id !== item.id),
                );
              }}
              aria-label="Remove screenshot"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt=""
                className="size-full object-cover"
              />
            </button>
          ))}
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
          disabled={pending || !hasApiKey || previews.length === 0}
          onClick={() => {
            startTransition(async () => {
              const form = new FormData();
              if (note.trim()) form.set("note", note.trim());
              for (const item of previews) {
                form.append("images", await resizeToJpeg(item.file));
              }
              const result = await extractExpectedOrders(form);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              if (result.empty) {
                toast.message("No orders found in those screenshots.");
                return;
              }
              toast.success(
                result.orders.length === 1
                  ? "Saved 1 expected order"
                  : `Saved ${result.orders.length} expected orders`,
              );
              setNote("");
              clearPreviews();
            });
          }}
        >
          {pending ? "Extracting…" : "Extract and save orders"}
        </Button>
      </div>
    </div>
  );
}
