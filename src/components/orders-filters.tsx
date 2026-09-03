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

export function OrdersFilters({
  q,
  invoiceType,
  preset,
}: {
  q: string;
  invoiceType: string;
  preset: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function push(next: { q?: string; type?: string; preset?: string }) {
    const params = new URLSearchParams();
    const query = next.q ?? q;
    const type = next.type ?? invoiceType;
    const range = next.preset ?? preset;
    if (query) params.set("q", query);
    if (type && type !== "all") params.set("type", type);
    if (range && range !== "all") params.set("preset", range);
    startTransition(() => {
      router.push(`/orders?${params.toString()}`);
    });
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        push({ q: String(form.get("q") ?? "") });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Consignment, order, name, phone"
          disabled={pending}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Invoice type</Label>
        <Select
          value={invoiceType}
          onValueChange={(value) => {
            if (typeof value === "string") push({ type: value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="return">Return</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Period</Label>
        <Select
          value={preset}
          onValueChange={(value) => {
            if (typeof value === "string") push({ preset: value });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </form>
  );
}
