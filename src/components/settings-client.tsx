"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addProduct,
  deleteProduct,
  saveProductRecipe,
  setDefaultProduct,
  type ProductWithLines,
} from "@/app/settings-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  applyStaged,
  BUILTIN_LABELS,
  isActiveLine,
  mergeBuiltinLines,
  profitStatement,
  type CostLineInput,
  type CostMode,
  type CostSource,
  validateRecipe,
} from "@/lib/cost-recipe";
import { formatBdt, toNumber } from "@/lib/money";
import { lineFromRow } from "@/lib/recipe-rows";
import { cn } from "@/lib/utils";

function amountInput(value: number | null): string {
  if (value == null) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

function sellingInput(value: number | string | null): string {
  if (value == null || value === "") return "";
  const n = toNumber(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function SettingsClient({
  products,
  selectedId,
}: {
  products: ProductWithLines[];
  selectedId: number | null;
}) {
  const router = useRouter();
  const selected = products.find((product) => product.id === selectedId) ?? products[0];
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(selected?.name ?? "");
  const [sellingPrice, setSellingPrice] = useState(sellingInput(selected?.selling_price ?? null));
  const [previewPrice, setPreviewPrice] = useState(
    sellingInput(selected?.selling_price ?? null) || "1000",
  );
  const [previewFee, setPreviewFee] = useState("80");
  const [previewReturn, setPreviewReturn] = useState("0");
  const [lines, setLines] = useState<CostLineInput[]>(
    mergeBuiltinLines(selected?.lines.map(lineFromRow) ?? []),
  );
  const [error, setError] = useState<string | null>(null);

  const productKey = selected?.id ?? 0;
  const [loadedId, setLoadedId] = useState(productKey);
  if (productKey !== loadedId) {
    setLoadedId(productKey);
    setName(selected?.name ?? "");
    setSellingPrice(sellingInput(selected?.selling_price ?? null));
    setPreviewPrice(sellingInput(selected?.selling_price ?? null) || "1000");
    setLines(mergeBuiltinLines(selected?.lines.map(lineFromRow) ?? []));
    setError(null);
  }

  const split = useMemo(() => {
    const price = toNumber(previewPrice);
    const fee = toNumber(previewFee);
    const returns = toNumber(previewReturn);
    return applyStaged(
      {
        collected: Number.isFinite(price) ? price : 0,
        deliveryCharge: Number.isFinite(fee) ? fee : 0,
        returnFees: Number.isFinite(returns) ? returns : 0,
        orderCount: 1,
      },
      lines,
    );
  }, [previewPrice, previewFee, previewReturn, lines]);

  const statement = useMemo(() => profitStatement(split), [split]);

  const check = validateRecipe(lines);

  function updateLine(index: number, patch: Partial<CostLineInput>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function save() {
    if (!selected) return;
    if (!check.ok) {
      setError(check.message);
      toast.error(check.message);
      return;
    }
    const form = new FormData();
    form.set("product_id", String(selected.id));
    form.set("name", name);
    form.set("selling_price", sellingPrice);
    form.set("lines", JSON.stringify(lines));
    startTransition(async () => {
      const result = await saveProductRecipe(form);
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setError(null);
      toast.success("Recipe saved");
      router.refresh();
    });
  }

  if (!selected) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a business from the sidebar, then return here to set item costs.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Pathao orders use the default item.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ul className="grid gap-1">
            {products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-sm ${
                    product.id === selected.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => router.push(`/settings?product=${product.id}`)}
                >
                  <span className="truncate">{product.name}</span>
                  {product.is_default ? (
                    <span className="text-xs opacity-80">Default</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-2"
            action={(formData) => {
              startTransition(async () => {
                const result = await addProduct(formData);
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }
                toast.success("Item added");
                router.push(`/settings?product=${result.id}`);
                router.refresh();
              });
            }}
          >
            <Label htmlFor="new-item">New item</Label>
            <Input id="new-item" name="name" placeholder="e.g. Serum 30ml" required />
            <Button type="submit" variant="outline" disabled={pending}>
              Add item
            </Button>
          </form>
          {!selected.is_default ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await setDefaultProduct(selected.id);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Default item updated");
                  router.refresh();
                });
              }}
            >
              Use for Pathao orders
            </Button>
          ) : null}
          {!selected.is_default ? (
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await deleteProduct(selected.id);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Item deleted");
                  router.push("/settings");
                  router.refresh();
                });
              }}
            >
              Delete item
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cost recipe</CardTitle>
            <CardDescription>
              Net payout is collected minus delivery charge minus return fees.
              After costs is net payout minus packaging and other costs. Product
              and profit percents apply to after costs. Delivery Auto uses each
              order’s Pathao fee; Manual is extra after net payout.
            </CardDescription>
            {lines.some(
              (line) =>
                (line.slot === "packaging" || line.slot === "marketing") &&
                isActiveLine(line),
            ) ? (
              <p className="text-xs text-muted-foreground">
                Packaging and marketing here are estimates per order. Actual
                cash spend is logged on Expenses. Do not enter the same spend
                in both unless you mean to.
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="item-name">Name</Label>
                <Input
                  id="item-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="selling-price">Typical selling price (optional)</Label>
                <Input
                  id="selling-price"
                  inputMode="decimal"
                  value={sellingPrice}
                  onChange={(event) => setSellingPrice(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid gap-3">
              {lines.map((line, index) => (
                <div
                  key={`${line.slot}-${line.id ?? index}`}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_7.5rem_7rem_8rem_auto]"
                >
                  {line.slot === "custom" ? (
                    <Input
                      value={line.label}
                      onChange={(event) =>
                        updateLine(index, { label: event.target.value })
                      }
                      placeholder="Variable name"
                    />
                  ) : (
                    <p className="flex items-center text-sm font-medium">
                      {BUILTIN_LABELS[line.slot] ?? line.label}
                    </p>
                  )}
                  {line.slot === "delivery" ? (
                    <select
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={line.source}
                      onChange={(event) => {
                        const source = event.target.value as CostSource;
                        updateLine(
                          index,
                          source === "auto"
                            ? { source: "auto", mode: "fixed", value: null }
                            : { source: "manual", mode: "percent", value: null },
                        );
                      }}
                    >
                      <option value="auto">Auto</option>
                      <option value="manual">Manual</option>
                    </select>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                  {line.slot === "delivery" && line.source === "auto" ? (
                    <>
                      <p className="flex items-center text-sm text-muted-foreground sm:col-span-2">
                        Pathao fee on each order
                      </p>
                      <span className="hidden sm:block" />
                    </>
                  ) : (
                    <>
                      <select
                        className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                        value={line.mode}
                        onChange={(event) =>
                          updateLine(index, { mode: event.target.value as CostMode })
                        }
                      >
                        <option value="percent">Percent</option>
                        <option value="fixed">Fixed ৳</option>
                      </select>
                      <Input
                        inputMode="decimal"
                        value={amountInput(line.value)}
                        placeholder={line.mode === "percent" ? "0" : "0.00"}
                        className="tabular-nums"
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          updateLine(index, {
                            value: raw === "" ? null : Number(raw.replace(/,/g, "")),
                          });
                        }}
                      />
                      {line.slot === "custom" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setLines((current) => current.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground sm:self-center">
                          {line.slot === "product_cost" || line.slot === "profit"
                            ? line.mode === "percent"
                              ? "% of after costs"
                              : "৳ per order"
                            : line.mode === "percent"
                              ? "% of net payout"
                              : "৳ per order"}
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  {
                    slot: "custom",
                    label: "",
                    mode: "percent",
                    source: "manual",
                    value: null,
                    sort_order: (current.at(-1)?.sort_order ?? 50) + 10,
                  },
                ])
              }
            >
              Add variable
            </Button>

            {error || !check.ok ? (
              <p className="text-sm text-destructive">
                {error ?? (!check.ok ? check.message : null)}
              </p>
            ) : null}

            <div>
              <Button type="button" disabled={pending} onClick={save}>
                {pending ? "Saving…" : "Save recipe"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Recipe only — net payout, after costs, then product and profit
              shares. Logged expenses appear on the dashboard, not in this
              preview.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="preview-price">Collected</Label>
                <Input
                  id="preview-price"
                  inputMode="decimal"
                  value={previewPrice}
                  onChange={(event) => setPreviewPrice(event.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="preview-fee">Delivery charge</Label>
                <Input
                  id="preview-fee"
                  inputMode="decimal"
                  value={previewFee}
                  onChange={(event) => setPreviewFee(event.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="preview-return">Return fees</Label>
                <Input
                  id="preview-return"
                  inputMode="decimal"
                  value={previewReturn}
                  onChange={(event) => setPreviewReturn(event.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>
            <ul className="grid text-sm">
              {statement.map((row) => (
                <li
                  key={row.key}
                  className={cn(
                    "flex items-start justify-between gap-4 border-b border-border py-2 last:border-0",
                    row.role === "subtotal" &&
                      "rounded-md bg-muted/60 font-medium -mx-2 px-2",
                    row.role === "total" && "border-t-2 border-border font-semibold",
                    row.role === "note" && "pl-4 text-muted-foreground",
                  )}
                >
                  <span>
                    {row.label}
                    {row.hint ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {row.hint}
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">{formatBdt(row.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Inventory only uses product cost, on each delivery, without return
              fees.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
