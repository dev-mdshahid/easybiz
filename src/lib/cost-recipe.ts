export const BUILTIN_SLOTS = [
  "product_cost",
  "delivery",
  "packaging",
  "marketing",
  "profit",
] as const;

export type BuiltinSlot = (typeof BUILTIN_SLOTS)[number];
export type CostSlot = BuiltinSlot | "custom";
export type CostMode = "fixed" | "percent";
export type CostSource = "manual" | "auto";

export type CostLineInput = {
  id?: number;
  slot: CostSlot;
  label: string;
  mode: CostMode;
  source: CostSource;
  value: number | null;
  sort_order: number;
};

export type SplitLine = CostLineInput & { amount: number };

export const BUILTIN_LABELS: Record<BuiltinSlot, string> = {
  product_cost: "Product cost",
  delivery: "Delivery",
  packaging: "Packaging",
  marketing: "Marketing",
  profit: "Profit",
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function isAutoDelivery(line: CostLineInput): boolean {
  return line.slot === "delivery" && line.source === "auto";
}

export function hasAutoDelivery(lines: CostLineInput[]): boolean {
  return lines.some(isAutoDelivery);
}

export function resolvePathaoDelivery(
  lines: CostLineInput[],
  pathaoFee: number,
): CostLineInput[] {
  const fee = roundMoney(pathaoFee);
  return lines.map((line) =>
    isAutoDelivery(line) ? { ...line, mode: "fixed", value: fee } : line,
  );
}

export function isActiveLine(line: CostLineInput): boolean {
  return line.value != null && Number.isFinite(line.value);
}

export function isShareLine(line: CostLineInput): boolean {
  return line.slot === "product_cost" || line.slot === "profit";
}

export function isOperatingLine(line: CostLineInput): boolean {
  if (isAutoDelivery(line) || isShareLine(line)) return false;
  return line.slot === "packaging" ||
    line.slot === "marketing" ||
    line.slot === "custom" ||
    line.slot === "delivery";
}

function percentSum(lines: CostLineInput[]): number {
  return lines
    .filter((line) => isActiveLine(line) && line.mode === "percent")
    .reduce((sum, line) => sum + (line.value ?? 0), 0);
}

export function validateRecipe(
  lines: CostLineInput[],
): { ok: true } | { ok: false; message: string } {
  const seen = new Set<string>();
  for (const line of lines) {
    if (line.slot !== "custom") {
      if (seen.has(line.slot)) {
        return { ok: false, message: "Each built-in cost can only appear once." };
      }
      seen.add(line.slot);
    }
    if (line.source === "auto") {
      if (line.slot !== "delivery") {
        return { ok: false, message: "Only Delivery can use the Pathao fee automatically." };
      }
      continue;
    }
    if (line.slot === "custom" && isActiveLine(line) && line.label.trim() === "") {
      return { ok: false, message: "Give each extra variable a name." };
    }
    if (line.mode !== "fixed" && line.mode !== "percent") {
      return { ok: false, message: "Each line must be a fixed amount or a percent." };
    }
    if (line.value != null) {
      if (!Number.isFinite(line.value) || line.value < 0) {
        return { ok: false, message: "Amounts cannot be negative." };
      }
      if (line.mode === "percent" && line.value > 100) {
        return { ok: false, message: "A percent cannot be more than 100." };
      }
    }
  }
  if (percentSum(lines.filter(isOperatingLine)) > 100.0000001) {
    return {
      ok: false,
      message: "Packaging, marketing, and extra costs cannot add up to more than 100% of net payout.",
    };
  }
  if (percentSum(lines.filter(isShareLine)) > 100.0000001) {
    return {
      ok: false,
      message: "Product and profit percents cannot add up to more than 100% of what is left after costs.",
    };
  }
  return { ok: true };
}

export type StagedInput = {
  collected: number;
  deliveryCharge: number;
  returnFees: number;
  orderCount: number;
};

export type StagedSplit = {
  collected: number;
  deliveryCharge: number;
  returnFees: number;
  netPayout: number;
  extraDelivery: number;
  packagingCost: number;
  marketingCost: number;
  customLines: { label: string; amount: number }[];
  customCost: number;
  otherCost: number;
  afterCosts: number;
  shortfall: number;
  productCost: number;
  profitAmount: number;
  leftover: number;
  hasProfitLine: boolean;
  operatingProfit: number;
  autoDelivery: boolean;
  lines: SplitLine[];
};

function scaledAmount(line: CostLineInput, base: number, orderCount: number): number {
  if (line.mode === "fixed") {
    return roundMoney((line.value ?? 0) * Math.max(0, orderCount));
  }
  return roundMoney((base * (line.value ?? 0)) / 100);
}

export function applyStaged(input: StagedInput, lines: CostLineInput[]): StagedSplit {
  const collected = roundMoney(input.collected);
  const deliveryCharge = roundMoney(input.deliveryCharge);
  const returnFees = roundMoney(input.returnFees);
  const orderCount = Number.isFinite(input.orderCount) ? input.orderCount : 0;
  const netPayout = roundMoney(collected - deliveryCharge - returnFees);

  const operating = [...lines]
    .filter((line) => isOperatingLine(line) && isActiveLine(line))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

  const operatingLines: SplitLine[] = operating.map((line) => ({
    ...line,
    amount: scaledAmount(line, netPayout, orderCount),
  }));

  const extraDelivery = roundMoney(
    operatingLines
      .filter((line) => line.slot === "delivery")
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const packagingCost = roundMoney(
    operatingLines
      .filter((line) => line.slot === "packaging")
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const marketingCost = roundMoney(
    operatingLines
      .filter((line) => line.slot === "marketing")
      .reduce((sum, line) => sum + line.amount, 0),
  );
  const customLines = operatingLines
    .filter((line) => line.slot === "custom")
    .map((line) => ({ label: line.label, amount: line.amount }));
  const customCost = roundMoney(customLines.reduce((sum, line) => sum + line.amount, 0));
  const otherCost = roundMoney(extraDelivery + marketingCost + customCost);
  const opsTotal = roundMoney(packagingCost + otherCost);

  let afterCosts = roundMoney(netPayout - opsTotal);
  let shortfall = 0;
  if (afterCosts < 0) {
    shortfall = roundMoney(-afterCosts);
    afterCosts = 0;
  }

  const productLine = lines.find((line) => line.slot === "product_cost" && isActiveLine(line));
  const profitLine = lines.find((line) => line.slot === "profit" && isActiveLine(line));
  const productCost = productLine ? scaledAmount(productLine, afterCosts, orderCount) : 0;
  const profitAmount = profitLine ? scaledAmount(profitLine, afterCosts, orderCount) : 0;
  const leftover = roundMoney(afterCosts - productCost - profitAmount);
  const hasProfitLine = Boolean(profitLine);

  const shareLines: SplitLine[] = [];
  if (productLine) shareLines.push({ ...productLine, amount: productCost });
  if (profitLine) shareLines.push({ ...profitLine, amount: profitAmount });

  return {
    collected,
    deliveryCharge,
    returnFees,
    netPayout,
    extraDelivery,
    packagingCost,
    marketingCost,
    customLines,
    customCost,
    otherCost,
    afterCosts,
    shortfall,
    productCost,
    profitAmount,
    leftover,
    hasProfitLine,
    operatingProfit: hasProfitLine ? profitAmount : leftover,
    autoDelivery: hasAutoDelivery(lines),
    lines: [...operatingLines, ...shareLines],
  };
}

export function pathaoFinalPayout(
  collected: number,
  deliveryCharge: number,
  returnFee: number,
): number {
  return roundMoney(collected - deliveryCharge - returnFee);
}

export type RecipePeriodRow = {
  collected: number;
  pathaoFee: number;
};

export function summarizeDeliveries(
  rows: RecipePeriodRow[],
  lines: CostLineInput[],
  returnFees = 0,
): StagedSplit {
  return applyStaged(
    {
      collected: rows.reduce((sum, row) => sum + row.collected, 0),
      deliveryCharge: rows.reduce((sum, row) => sum + row.pathaoFee, 0),
      returnFees,
      orderCount: rows.length,
    },
    lines,
  );
}

function signedCost(amount: number): number {
  const value = roundMoney(-amount);
  return value === 0 ? 0 : value;
}

export type ProfitStatementRow = {
  key: string;
  label: string;
  amount: number;
  role: "inflow" | "cost" | "note" | "subtotal" | "total";
  hint?: string;
};

export function profitStatement(split: StagedSplit): ProfitStatementRow[] {
  const rows: ProfitStatementRow[] = [
    {
      key: "collected",
      label: "Collected",
      amount: roundMoney(split.collected),
      role: "inflow",
      hint: "From Pathao deliveries",
    },
    {
      key: "delivery",
      label: "Delivery charge",
      amount: signedCost(split.deliveryCharge),
      role: "cost",
      hint: split.autoDelivery
        ? "Pathao fee on each delivery (Auto)"
        : "Pathao fee on each delivery",
    },
    {
      key: "return-fee",
      label: "Return fees",
      amount: signedCost(split.returnFees),
      role: "cost",
      hint: "Pathao fee on returned consignments",
    },
    {
      key: "net-payout",
      label: "Net payout",
      amount: roundMoney(split.netPayout),
      role: "subtotal",
      hint: "Collected − delivery charge − return fees",
    },
  ];

  if (split.packagingCost) {
    rows.push({
      key: "packaging",
      label: "Packaging",
      amount: signedCost(split.packagingCost),
      role: "cost",
      hint: "Taken from net payout",
    });
  }

  if (split.extraDelivery) {
    rows.push({
      key: "extra-delivery",
      label: "Extra delivery",
      amount: signedCost(split.extraDelivery),
      role: "cost",
      hint: "Manual extra delivery from Settings",
    });
  }

  if (split.marketingCost) {
    rows.push({
      key: "marketing",
      label: "Marketing",
      amount: signedCost(split.marketingCost),
      role: "cost",
      hint: "Taken from net payout",
    });
  }

  split.customLines.forEach((line, index) => {
    rows.push({
      key: `custom-${index}`,
      label: line.label,
      amount: signedCost(line.amount),
      role: "cost",
    });
  });

  rows.push({
    key: "after-costs",
    label: "After costs",
    amount: roundMoney(split.afterCosts),
    role: "subtotal",
    hint: "Net payout − packaging − other costs. Product and profit % apply here.",
  });

  if (split.shortfall > 0) {
    rows.push({
      key: "shortfall",
      label: "Costs exceed net payout",
      amount: signedCost(split.shortfall),
      role: "note",
    });
  }

  rows.push({
    key: "product",
    label: "Product cost",
    amount: signedCost(split.productCost),
    role: "cost",
    hint: "Share of after costs",
  });

  if (split.hasProfitLine) {
    rows.push({
      key: "profit",
      label: "Profit",
      amount: roundMoney(split.profitAmount),
      role: "total",
      hint: "Share of after costs",
    });
    if (split.leftover !== 0) {
      rows.push({
        key: "leftover",
        label: "Unallocated",
        amount: roundMoney(split.leftover),
        role: "note",
        hint: "What remains after product and profit shares",
      });
    }
  } else {
    rows.push({
      key: "profit",
      label: "Profit",
      amount: roundMoney(split.leftover),
      role: "total",
      hint: "What remains after product cost",
    });
  }

  return rows;
}

export function builtinTemplate(): CostLineInput[] {
  return BUILTIN_SLOTS.map((slot, index) => ({
    slot,
    label: BUILTIN_LABELS[slot],
    mode: "percent" as const,
    source: "manual" as const,
    value: null,
    sort_order: (index + 1) * 10,
  }));
}

export function mergeBuiltinLines(lines: CostLineInput[]): CostLineInput[] {
  const bySlot = new Map(
    lines.filter((line) => line.slot !== "custom").map((line) => [line.slot, line]),
  );
  const customs = lines.filter((line) => line.slot === "custom");
  return [...builtinTemplate().map((line) => bySlot.get(line.slot) ?? line), ...customs];
}
