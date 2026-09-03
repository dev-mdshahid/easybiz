import { readFileSync } from "node:fs";

import { parsePathaoCsv } from "../src/lib/pathao-csv";

const path = process.argv[2];
const parsed = parsePathaoCsv(readFileSync(path, "utf8"));
if (!parsed.ok) {
  console.error(parsed.message);
  process.exit(1);
}

const deliveries = parsed.rows.filter((r) => r.invoice_type === "delivery");
const revenue = deliveries.reduce((s, r) => s + r.collected_amount, 0);
const cost = parsed.rows.reduce((s, r) => s + r.final_fee, 0);
const profit = parsed.rows.reduce((s, r) => s + r.payout, 0);
const uncollected = parsed.rows.reduce(
  (s, r) => s + Math.max(r.collectable_amount - r.collected_amount, 0),
  0,
);
const owed = parsed.rows.reduce((s, r) => s + (r.payout < 0 ? -r.payout : 0), 0);

console.log(
  JSON.stringify(
    {
      rows: parsed.rows.length,
      errors: parsed.errors.length,
      deliveries: deliveries.length,
      returns: parsed.rows.length - deliveries.length,
      revenue: Number(revenue.toFixed(2)),
      cost: Number(cost.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      uncollected: Number(uncollected.toFixed(2)),
      owed: Number(owed.toFixed(2)),
      liabilities: Number((uncollected + owed).toFixed(2)),
    },
    null,
    2,
  ),
);
