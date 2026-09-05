import { formatAddressForPathao, explicitCityFromText } from "@/lib/pathao-address";

export const EXPECTED_ORDER_STATUSES = [
  "needs_review",
  "ready",
  "exported",
  "created",
  "failed",
  "discarded",
] as const;

export type ExpectedOrderStatus = (typeof EXPECTED_ORDER_STATUSES)[number];

export const ITEM_TYPES = ["parcel", "document"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

const BANGLA_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function latinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] ?? d);
}

export function normalizePhone(raw: string | null | undefined): string {
  const digits = latinDigits(raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  let n = digits;
  if (n.startsWith("880") && n.length >= 13) n = n.slice(3);
  else if (n.startsWith("88") && n.length >= 13) n = n.slice(2);
  if (n.length === 10 && n.startsWith("1")) n = `0${n}`;
  return n;
}

export function isValidBdMobile(phone: string): boolean {
  return /^01[3-9]\d{8}$/.test(phone);
}

export function parseAmount(raw: unknown): { value: number | null; explicit: boolean } {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return { value: Math.round(raw * 100) / 100, explicit: true };
  }
  if (raw == null) return { value: null, explicit: false };
  let text = latinDigits(String(raw)).trim().toLowerCase();
  if (!text) return { value: null, explicit: false };
  text = text.replace(/,/g, "").replace(/৳|tk|taka|bdt/gi, "").trim();
  const k = text.match(/^(\d+(?:\.\d+)?)\s*k$/);
  if (k) {
    return { value: Math.round(Number(k[1]) * 1000 * 100) / 100, explicit: true };
  }
  const n = Number(text);
  if (!Number.isFinite(n)) return { value: null, explicit: true };
  return { value: Math.round(n * 100) / 100, explicit: true };
}

export type ProductHint = {
  id: number;
  name: string;
  selling_price: number | null;
};

export const EXPECTED_ORDER_MAX_IMAGES = 16;
export const EXPECTED_ORDER_MAX_QUEUE = 64;

export function clampScreenshotBatchSize(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return EXPECTED_ORDER_MAX_IMAGES;
  return Math.min(EXPECTED_ORDER_MAX_IMAGES, Math.max(1, n));
}

export function screenshotBatchOverlap(batchSize: number): number {
  const size = clampScreenshotBatchSize(batchSize);
  return Math.min(2, Math.max(0, size - 1));
}

export type ScreenshotBatch = {
  start: number;
  end: number;
  newStart: number;
};

export function planScreenshotBatches(options: {
  imageCount: number;
  batchSize: number;
}): ScreenshotBatch[] {
  const count = Math.max(0, Math.floor(Number(options.imageCount) || 0));
  if (count === 0) return [];
  const batchSize = clampScreenshotBatchSize(options.batchSize);
  const overlap = screenshotBatchOverlap(batchSize);
  const batches: ScreenshotBatch[] = [];
  let processed = 0;
  while (processed < count) {
    const start = processed === 0 ? 0 : Math.max(0, processed - overlap);
    const end = Math.min(count, start + batchSize);
    if (end <= processed) break;
    batches.push({ start, end, newStart: processed });
    processed = end;
  }
  return batches;
}

export type ExtractedOrderDraft = {
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  recipient_address_raw?: string | null;
  recipient_city?: string | null;
  recipient_zone?: string | null;
  recipient_area?: string | null;
  amount_to_collect?: number | string | null;
  item_quantity?: number | string | null;
  item_weight?: number | string | null;
  item_desc?: string | null;
  special_instruction?: string | null;
  item_type?: string | null;
  store_name?: string | null;
  warnings?: string[] | null;
  source_image_indexes?: number[] | null;
};

export type ExtractedOrderFragment = {
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  recipient_address_as_written: string | null;
  amount_to_collect: number | null;
  item_quantity: number | null;
  item_weight: number | null;
  item_desc: string | null;
  special_instruction: string | null;
  item_type: string | null;
  warnings: string[];
  source_image_indexes: number[];
};

export type OrderDefaults = {
  storeName: string;
  itemType: ItemType;
  itemWeight: number;
};

export type NormalizedExpectedOrder = {
  item_type: ItemType;
  store_name: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_address_raw: string;
  recipient_city: string;
  recipient_zone: string;
  recipient_area: string;
  amount_to_collect: number;
  item_quantity: number;
  item_weight: number;
  item_desc: string;
  special_instruction: string;
  product_id: number | null;
  warnings: string[];
  issues: string[];
  status: "needs_review" | "ready";
};

function trimText(value: string | null | undefined, max = 500): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseQty(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.round(raw));
  }
  const text = latinDigits(String(raw ?? "")).replace(/[^\d.]/g, "");
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.max(1, Math.round(n));
}

function parseWeight(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.round(raw * 100) / 100;
  }
  const text = latinDigits(String(raw ?? ""))
    .toLowerCase()
    .replace(/kg|kgs|কেজি/g, "")
    .trim();
  if (!text) return null;
  const n = Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

function matchProduct(
  desc: string,
  products: ProductHint[],
): ProductHint | null {
  const folded = desc.toLowerCase().trim();
  if (!folded || products.length === 0) return null;
  const exact = products.find((p) => p.name.toLowerCase() === folded);
  if (exact) return exact;
  const contained = products.find(
    (p) =>
      folded.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(folded),
  );
  return contained ?? null;
}

export function normalizeExpectedOrder(
  draft: ExtractedOrderDraft,
  defaults: OrderDefaults,
  products: ProductHint[] = [],
): NormalizedExpectedOrder {
  const warnings = [...(draft.warnings ?? [])].filter(
    (w) => typeof w === "string" && w.trim() !== "",
  );
  const issues: string[] = [];

  const name = trimText(draft.recipient_name, 100);
  const phone = normalizePhone(draft.recipient_phone);
  const rawAddress = trimText(
    draft.recipient_address_raw || draft.recipient_address,
    500,
  );
  const formatted = formatAddressForPathao({
    address: trimText(draft.recipient_address, 500) || rawAddress,
    city: trimText(draft.recipient_city, 80),
    source: rawAddress,
  });
  const address = formatted.formatted;
  const typedCity = trimText(draft.recipient_city, 80);
  const city =
    explicitCityFromText(typedCity) ||
    explicitCityFromText(address) ||
    "";
  const zone = trimText(draft.recipient_zone, 80);
  const area = trimText(draft.recipient_area, 80);
  const amountParsed = parseAmount(draft.amount_to_collect);
  const qty = parseQty(draft.item_quantity) ?? 1;
  const weight = parseWeight(draft.item_weight) ?? defaults.itemWeight;
  const itemTypeRaw = trimText(draft.item_type).toLowerCase();
  const itemType: ItemType =
    itemTypeRaw === "document" || itemTypeRaw === "documents"
      ? "document"
      : defaults.itemType;
  let desc = trimText(draft.item_desc, 200);
  const instruction = trimText(draft.special_instruction, 200);
  const store = trimText(draft.store_name, 80) || defaults.storeName;

  const product = matchProduct(desc, products);
  if (!desc && products.length === 1) {
    desc = products[0].name;
  } else if (!desc && product) {
    desc = product.name;
  }

  let amount = amountParsed.value;
  if (amount == null) {
    issues.push("Price / amount to collect is required.");
    amount = 0;
  }

  if (name.length < 3) issues.push("Recipient name is required.");
  if (!isValidBdMobile(phone)) issues.push("Phone must be an 11-digit Bangladeshi mobile.");
  if (address.length < 10) issues.push("Delivery address is required (at least 10 characters).");
  if (!city) {
    issues.push(
      "City is required. The customer must name the city/district, or type it in edit so it can be added to the address.",
    );
  }
  if (amount < 0 || !Number.isFinite(amount)) issues.push("Amount to collect is invalid.");
  if (weight < 0.5 || weight > 10) issues.push("Weight must be between 0.5 and 10 kg.");
  if (qty < 1) issues.push("Quantity must be at least 1.");

  return {
    item_type: itemType,
    store_name: store,
    recipient_name: name,
    recipient_phone: phone,
    recipient_address: address,
    recipient_address_raw: formatted.raw || rawAddress || address,
    recipient_city: city,
    recipient_zone: zone,
    recipient_area: area,
    amount_to_collect: amount,
    item_quantity: qty,
    item_weight: weight,
    item_desc: desc,
    special_instruction: instruction,
    product_id: product?.id ?? null,
    warnings,
    issues,
    status: issues.length === 0 ? "ready" : "needs_review",
  };
}

export function statusAfterEdit(
  next: "needs_review" | "ready",
  previous: string,
): ExpectedOrderStatus {
  if (previous === "discarded") return "discarded";
  if (previous === "created") return "created";
  if (next === "needs_review") return "needs_review";
  if (previous === "exported") return "exported";
  return "ready";
}

export function merchantOrderId(id: number): string {
  return `EB-${id}`;
}

export function asWarningList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

const COMBINED_WARNING = "Combined fields from multiple screenshots.";
const FRAGMENT_WARNING =
  "This may be part of the same order as another screenshot. Review before sending.";

function usablePhone(phone: string | null): string {
  const normalized = normalizePhone(phone);
  return isValidBdMobile(normalized) ? normalized : "";
}

function sameCod(left: number | null, right: number | null): boolean {
  if (left == null || right == null) return true;
  return left === right;
}

function similarName(left: string | null, right: string | null): boolean {
  const a = (left ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const b = (right ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function overlappingIndexes(left: number[], right: number[]): boolean {
  if (left.length === 0 || right.length === 0) return false;
  const other = new Set(right);
  return left.some((index) => other.has(index));
}

function uniqueWarnings(values: string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

function uniqueIndexes(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 1))].sort(
    (a, b) => a - b,
  );
}

function pickText(left: string | null, right: string | null): string | null {
  const a = left?.replace(/\s+/g, " ").trim() || null;
  const b = right?.replace(/\s+/g, " ").trim() || null;
  return a || b;
}

function pickNumber(left: number | null, right: number | null): number | null {
  return left != null && Number.isFinite(left) ? left : right;
}

function cloneFragment<T extends ExtractedOrderFragment>(order: T): T {
  return {
    ...order,
    warnings: [...order.warnings],
    source_image_indexes: [...order.source_image_indexes],
  };
}

function mergeFragments<T extends ExtractedOrderFragment>(left: T, right: T): T {
  return {
    ...left,
    recipient_name: pickText(left.recipient_name, right.recipient_name),
    recipient_phone: pickText(left.recipient_phone, right.recipient_phone),
    recipient_address: pickText(left.recipient_address, right.recipient_address),
    recipient_address_as_written: pickText(
      left.recipient_address_as_written,
      right.recipient_address_as_written,
    ),
    amount_to_collect: pickNumber(left.amount_to_collect, right.amount_to_collect),
    item_quantity: pickNumber(left.item_quantity, right.item_quantity),
    item_weight: pickNumber(left.item_weight, right.item_weight),
    item_desc: pickText(left.item_desc, right.item_desc),
    special_instruction: pickText(left.special_instruction, right.special_instruction),
    item_type: pickText(left.item_type, right.item_type),
    warnings: uniqueWarnings([...left.warnings, ...right.warnings, COMBINED_WARNING]),
    source_image_indexes: uniqueIndexes([
      ...left.source_image_indexes,
      ...right.source_image_indexes,
    ]),
  };
}

function warnPhonelessFragments<T extends ExtractedOrderFragment>(orders: T[]): T[] {
  const next = orders.map(cloneFragment);
  for (let i = 0; i < next.length; i += 1) {
    if (usablePhone(next[i].recipient_phone)) continue;
    for (let j = i + 1; j < next.length; j += 1) {
      if (usablePhone(next[j].recipient_phone)) continue;
      const similar = similarName(next[i].recipient_name, next[j].recipient_name);
      const overlap = overlappingIndexes(
        next[i].source_image_indexes,
        next[j].source_image_indexes,
      );
      if (!similar && !overlap) continue;
      next[i].warnings = uniqueWarnings([...next[i].warnings, FRAGMENT_WARNING]);
      next[j].warnings = uniqueWarnings([...next[j].warnings, FRAGMENT_WARNING]);
    }
  }
  return next;
}

export function collapseExtractedOrders<T extends ExtractedOrderFragment>(
  orders: T[],
): T[] {
  const prepared = warnPhonelessFragments(orders);
  const used = new Set<number>();
  const collapsed: T[] = [];

  for (let i = 0; i < prepared.length; i += 1) {
    if (used.has(i)) continue;
    let current = prepared[i];
    const phone = usablePhone(current.recipient_phone);
    if (!phone) {
      collapsed.push(current);
      continue;
    }
    for (let j = i + 1; j < prepared.length; j += 1) {
      if (used.has(j)) continue;
      const other = prepared[j];
      if (usablePhone(other.recipient_phone) !== phone) continue;
      if (!sameCod(current.amount_to_collect, other.amount_to_collect)) continue;
      current = mergeFragments(current, other);
      used.add(j);
    }
    collapsed.push(current);
  }

  return collapsed;
}

export type QueuePriorOrder = {
  id: number;
  recipient_phone: string;
  amount_to_collect: number;
  status: string;
};

export type QueueMatchDecision =
  | { action: "insert" }
  | { action: "update"; priorId: number }
  | { action: "skip"; warning: string };

export function matchDraftToQueuePrior(
  draft: {
    recipient_phone?: string | null;
    amount_to_collect?: number | string | null;
  },
  priors: QueuePriorOrder[],
  usedPriorIds: Set<number>,
): QueueMatchDecision {
  const phone = usablePhone(draft.recipient_phone ?? null);
  if (!phone) return { action: "insert" };
  const draftAmount = parseAmount(draft.amount_to_collect).value;

  for (const prior of priors) {
    if (usedPriorIds.has(prior.id)) continue;
    if (usablePhone(prior.recipient_phone) !== phone) continue;
    if (prior.status === "discarded") continue;

    const priorAmount = Number(prior.amount_to_collect);
    const priorAmountNum = Number.isFinite(priorAmount) ? priorAmount : 0;
    const completingMissingPrice =
      prior.status === "needs_review" && priorAmountNum === 0 && draftAmount != null;
    const differentCod =
      draftAmount != null &&
      draftAmount !== priorAmountNum &&
      !completingMissingPrice;

    if (prior.status === "created") {
      if (differentCod) return { action: "insert" };
      return {
        action: "skip",
        warning: "Skipped a duplicate of an order already created in Pathao.",
      };
    }

    if (differentCod) continue;
    return { action: "update", priorId: prior.id };
  }

  return { action: "insert" };
}

export function overlayPriorWithDraft(
  prior: {
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    recipient_address_raw: string;
    recipient_city: string;
    recipient_zone: string;
    recipient_area: string;
    amount_to_collect: number;
    item_quantity: number;
    item_weight: number;
    item_desc: string;
    special_instruction: string;
    item_type: string;
    store_name: string;
    warnings: unknown;
  },
  next: NormalizedExpectedOrder,
): ExtractedOrderDraft {
  const priorAmount = Number(prior.amount_to_collect) || 0;
  const amount =
    priorAmount === 0 && next.amount_to_collect > 0 ? next.amount_to_collect : priorAmount || next.amount_to_collect;
  return {
    recipient_name: prior.recipient_name.trim() || next.recipient_name,
    recipient_phone: prior.recipient_phone.trim() || next.recipient_phone,
    recipient_address:
      next.recipient_address.length > prior.recipient_address.length
        ? next.recipient_address
        : prior.recipient_address.trim() || next.recipient_address,
    recipient_address_raw: prior.recipient_address_raw.trim() || next.recipient_address_raw,
    recipient_city: prior.recipient_city.trim() || next.recipient_city,
    recipient_zone: prior.recipient_zone.trim() || next.recipient_zone,
    recipient_area: prior.recipient_area.trim() || next.recipient_area,
    amount_to_collect: amount,
    item_quantity: prior.item_quantity || next.item_quantity,
    item_weight: prior.item_weight || next.item_weight,
    item_desc: prior.item_desc.trim() || next.item_desc,
    special_instruction: prior.special_instruction.trim() || next.special_instruction,
    item_type: prior.item_type || next.item_type,
    store_name: prior.store_name.trim() || next.store_name,
    warnings: uniqueWarnings([
      ...asWarningList(prior.warnings),
      ...next.warnings,
      "Updated from a later screenshot batch.",
    ]),
  };
}
