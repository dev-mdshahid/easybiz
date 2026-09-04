import { z } from "zod";

import {
  cityNamesForPrompt,
  locationCatalogForPrompt,
  resolveLocation,
  zoneNamesForPrompt,
} from "@/lib/pathao-locations";
import type { ProductHint } from "@/lib/expected-order";
import { resolveAiConnection } from "@/lib/ai-providers";

export type ChatImage = {
  mimeType: string;
  dataUrl: string;
};

export type ExtractedAiOrder = {
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  recipient_city: string | null;
  recipient_zone: string | null;
  recipient_area: string | null;
  amount_to_collect: number | null;
  item_quantity: number | null;
  item_weight: number | null;
  item_desc: string | null;
  special_instruction: string | null;
  item_type: string | null;
  warnings: string[];
};

const orderSchema = z.object({
  recipient_name: z.string().nullable().optional(),
  recipient_phone: z.string().nullable().optional(),
  recipient_address: z.string().nullable().optional(),
  recipient_city: z.string().nullable().optional(),
  recipient_zone: z.string().nullable().optional(),
  recipient_area: z.string().nullable().optional(),
  amount_to_collect: z.number().nullable().optional(),
  item_quantity: z.number().nullable().optional(),
  item_weight: z.number().nullable().optional(),
  item_desc: z.string().nullable().optional(),
  special_instruction: z.string().nullable().optional(),
  item_type: z.string().nullable().optional(),
  warnings: z.array(z.string()).optional(),
});

const payloadSchema = z.object({
  orders: z.array(orderSchema),
});

function buildSystemPrompt(products: ProductHint[]): string {
  const catalog =
    products.length === 0
      ? "No catalog items configured."
      : products
          .map((p) => {
            const price =
              p.selling_price == null ? "no list price" : `৳${p.selling_price}`;
            return `- ${p.name} (${price})`;
          })
          .join("\n");

  return `You extract courier orders from merchant–customer chat screenshots (WhatsApp, Messenger, Facebook, Instagram). Language may be Bangla, English, or mixed.

Return JSON only: {"orders":[...]}. One conversation can contain multiple orders. If nothing is an order, return {"orders":[]}.

For each order:
- recipient_name, recipient_phone, recipient_address, recipient_city, recipient_zone, recipient_area
- amount_to_collect (COD number, no currency symbols). Prepaid / already paid → 0
- item_quantity, item_weight (kg), item_desc, special_instruction, item_type ("parcel" or "document")
- warnings: short notes about guesses or missing fields

Rules:
- Prefer null over a bad guess for name, phone, and amount. Do NOT leave city or zone null if the address contains a locality.
- Bangladeshi mobiles: 11 digits starting with 01.
- Pathao CSV needs RecipientCity and RecipientZone as exact names. Infer both from the delivery address even when the customer never says “city” or “zone”.
- City is the Pathao city (Dhaka, Chattogram, Gazipur…). Zone is the Pathao thana/area inside that city (Uttara, Mirpur, Gulshan). Never put a zone name in city.
- Examples: “H-1, R-1, S-6, Uttara” → city Dhaka, zone Uttara. “Mirpur-10” → Dhaka / Mirpur. “Agrabad, CTG” → Chattogram / Agrabad. “Tongi” → Gazipur / Tongi.
- Use only these Pathao names:
${locationCatalogForPrompt()}
- Pathao cities: ${cityNamesForPrompt()}.
- Common Dhaka zones: ${zoneNamesForPrompt("Dhaka")}.
- recipient_area can be a more specific bit (sector, block) if present; otherwise null.
- Use the merchant catalog for item_desc when the chat matches a product. If COD is missing, you may use that product's list price and mention it in warnings.
Catalog:
${catalog}
- Special instructions: call before delivery, evening only, landmarks, etc.
- Ignore greetings, stickers, and unrelated chat.`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("The model did not return JSON.");
  }
  return JSON.parse(body.slice(start, end + 1)) as unknown;
}

function toAiOrder(row: z.infer<typeof orderSchema>): ExtractedAiOrder {
  return {
    recipient_name: row.recipient_name ?? null,
    recipient_phone: row.recipient_phone ?? null,
    recipient_address: row.recipient_address ?? null,
    recipient_city: row.recipient_city ?? null,
    recipient_zone: row.recipient_zone ?? null,
    recipient_area: row.recipient_area ?? null,
    amount_to_collect: row.amount_to_collect ?? null,
    item_quantity: row.item_quantity ?? null,
    item_weight: row.item_weight ?? null,
    item_desc: row.item_desc ?? null,
    special_instruction: row.special_instruction ?? null,
    item_type: row.item_type ?? null,
    warnings: row.warnings ?? [],
  };
}

export async function extractOrdersFromImages(options: {
  apiKey: string;
  provider?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  images: ChatImage[];
  note?: string;
  products: ProductHint[];
}): Promise<{ orders: ExtractedAiOrder[]; raw: unknown; model: string }> {
  const connection = resolveAiConnection({
    provider: options.provider,
    baseUrl: options.baseUrl,
    model: options.model,
  });
  const base = connection.baseUrl.replace(/\/+$/, "");
  const model = connection.model;
  const url = `${base}/chat/completions`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
  };
  if (connection.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://easybiz.app";
    headers["X-Title"] = "EasyBiz";
    headers["X-OpenRouter-Title"] = "EasyBiz";
  }

  const imageParts = options.images.map((image) => ({
    type: "image_url" as const,
    image_url: { url: image.dataUrl },
  }));

  const userText = options.note?.trim()
    ? `Merchant note:\n${options.note.trim()}\n\nExtract every order from the screenshots.`
    : "Extract every order from the screenshots.";

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: buildSystemPrompt(options.products) },
      {
        role: "user",
        content: [{ type: "text", text: userText }, ...imageParts],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "expected_orders",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["orders"],
          properties: {
            orders: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "recipient_name",
                  "recipient_phone",
                  "recipient_address",
                  "recipient_city",
                  "recipient_zone",
                  "recipient_area",
                  "amount_to_collect",
                  "item_quantity",
                  "item_weight",
                  "item_desc",
                  "special_instruction",
                  "item_type",
                  "warnings",
                ],
                properties: {
                  recipient_name: { type: ["string", "null"] },
                  recipient_phone: { type: ["string", "null"] },
                  recipient_address: { type: ["string", "null"] },
                  recipient_city: { type: ["string", "null"] },
                  recipient_zone: { type: ["string", "null"] },
                  recipient_area: { type: ["string", "null"] },
                  amount_to_collect: { type: ["number", "null"] },
                  item_quantity: { type: ["number", "null"] },
                  item_weight: { type: ["number", "null"] },
                  item_desc: { type: ["string", "null"] },
                  special_instruction: { type: ["string", "null"] },
                  item_type: { type: ["string", "null"] },
                  warnings: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  };

  async function call(payload: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const json = (await response.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!response.ok) {
      throw new Error(json.error?.message || `AI request failed (${response.status})`);
    }
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("The model returned an empty response.");
    return extractJsonObject(content);
  }

  let raw: unknown;
  try {
    raw = await call(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/response_format|json_schema|unrecognized|unsupported/i.test(message)) {
      const fallback = { ...body };
      delete fallback.response_format;
      raw = await call(fallback);
    } else {
      throw error;
    }
  }

  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The model returned orders in an unexpected shape.");
  }

  return {
    orders: parsed.data.orders.map(toAiOrder),
    raw,
    model,
  };
}

const locationRowSchema = z.object({
  index: z.number(),
  city: z.string().nullable().optional(),
  zone: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
});

const locationPayloadSchema = z.object({
  locations: z.array(locationRowSchema),
});

export type AddressLocationHint = {
  address: string;
  city?: string | null;
  zone?: string | null;
  area?: string | null;
};

export type InferredPathaoLocation = {
  city: string;
  zone: string;
  area: string;
};

function locationSystemPrompt(): string {
  return `You map Bangladesh delivery addresses to Pathao Merchant bulk-order fields RecipientCity and RecipientZone.

Return JSON only: {"locations":[{"index":0,"city":"...","zone":"...","area":"..."}]}.

Rules:
- Pick the single most appropriate Pathao city and zone for each address. Use exact names from this catalog (copy spelling):
${locationCatalogForPrompt()}
- Infer from the full address, landmarks, thana, sector, and any city/zone hints. The customer often only writes a street address.
- City is never a Dhaka neighbourhood. Uttara, Mirpur, Gulshan, Dhanmondi, Mohammadpur, Badda, etc. are zones in Dhaka.
- If several zones could fit, choose the one that best matches the most specific locality in the address (sector, block, thana).
- area is optional extra detail (sector, block). Use "" if none.
- Never invent a city that is not in the catalog. Pathao covers all 64 districts (including Thakurgaon, Dinajpur, Panchagarh, Tangail, and the rest). For a district town with no thana, use city name plus "Sadar" as the zone.`;
}

export async function inferPathaoLocations(options: {
  apiKey: string;
  provider?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  rows: AddressLocationHint[];
}): Promise<InferredPathaoLocation[]> {
  if (options.rows.length === 0) return [];

  const connection = resolveAiConnection({
    provider: options.provider,
    baseUrl: options.baseUrl,
    model: options.model,
  });
  const base = connection.baseUrl.replace(/\/+$/, "");
  const model = connection.model;
  const url = `${base}/chat/completions`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
    "Content-Type": "application/json",
  };
  if (connection.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://easybiz.app";
    headers["X-Title"] = "EasyBiz";
    headers["X-OpenRouter-Title"] = "EasyBiz";
  }

  const payload = options.rows.map((row, index) => ({
    index,
    address: row.address,
    city_hint: row.city ?? null,
    zone_hint: row.zone ?? null,
    area_hint: row.area ?? null,
  }));

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: locationSystemPrompt() },
      {
        role: "user",
        content: `Choose the best Pathao city and zone for each address:\n${JSON.stringify(payload)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "pathao_locations",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["locations"],
          properties: {
            locations: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["index", "city", "zone", "area"],
                properties: {
                  index: { type: "integer" },
                  city: { type: ["string", "null"] },
                  zone: { type: ["string", "null"] },
                  area: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
  };

  async function call(next: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(next),
    });
    const json = (await response.json()) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    };
    if (!response.ok) {
      throw new Error(json.error?.message || `AI request failed (${response.status})`);
    }
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("The model returned an empty response.");
    return extractJsonObject(content);
  }

  let raw: unknown;
  try {
    raw = await call(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/response_format|json_schema|unrecognized|unsupported/i.test(message)) {
      const fallback = { ...body };
      delete fallback.response_format;
      raw = await call(fallback);
    } else {
      throw error;
    }
  }

  const parsed = locationPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The model returned locations in an unexpected shape.");
  }

  const byIndex = new Map(
    parsed.data.locations.map((row) => [row.index, row]),
  );

  return options.rows.map((row, index) => {
    const inferred = byIndex.get(index);
    const snapped = resolveLocation({
      city: inferred?.city ?? row.city,
      zone: inferred?.zone ?? row.zone,
      address: row.address,
    });
    return {
      city: snapped.city,
      zone: snapped.zone,
      area: (inferred?.area ?? row.area ?? "").trim(),
    };
  });
}
