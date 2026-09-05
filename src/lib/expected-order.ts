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
