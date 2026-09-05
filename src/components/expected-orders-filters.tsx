"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExpectedOrdersFilters({
  q,
  status,
}: {
  q: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function push(next: { q?: string; status?: string }) {
    const params = new URLSearchParams();
    const query = next.q ?? q;
    const nextStatus = next.status ?? status;
    if (query) params.set("q", query);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    startTransition(() => {
      router.push(`/expected-orders?${params.toString()}`);
    });
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        push({ q: String(form.get("q") ?? "") });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="expected-q">Search</Label>
        <Input
          id="expected-q"
          name="q"
          defaultValue={q}
          placeholder="Name, phone, merchant id, address"
          disabled={pending}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(value) => {
            if (typeof value === "string") push({ status: value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="needs_review">Needs review</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="exported">Exported</SelectItem>
            <SelectItem value="created">Created in Pathao</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="discarded">Discarded</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
