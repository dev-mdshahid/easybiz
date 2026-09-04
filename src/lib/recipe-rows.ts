import { toNumber } from "@/lib/money";
import type { CostLineInput } from "@/lib/cost-recipe";
import type { ProductCostLine } from "@/lib/supabase/database.types";

export function lineFromRow(row: ProductCostLine): CostLineInput {
  const source = row.source === "auto" ? "auto" : "manual";
  return {
    id: row.id,
    slot: row.slot as CostLineInput["slot"],
    label: row.label,
    mode: source === "auto" || row.mode === "fixed" ? "fixed" : "percent",
    source,
    value: source === "auto" || row.value == null ? null : toNumber(row.value),
    sort_order: row.sort_order,
  };
}
