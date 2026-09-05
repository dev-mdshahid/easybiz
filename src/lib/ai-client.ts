import { z } from "zod";

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

const orderSchema = z.object({
  recipient_name: z.string().nullable().optional(),
  recipient_phone: z.string().nullable().optional(),
  recipient_address: z.string().nullable().optional(),
  recipient_address_as_written: z.string().nullable().optional(),
  amount_to_collect: z.number().nullable().optional(),
  item_quantity: z.number().nullable().optional(),
  item_weight: z.number().nullable().optional(),
  item_desc: z.string().nullable().optional(),
  special_instruction: z.string().nullable().optional(),
  item_type: z.string().nullable().optional(),
  warnings: z.array(z.string()).optional(),
  source_image_indexes: z.array(z.number().int()).optional(),
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

  return `You extract courier orders from merchant–customer chat screenshots (WhatsApp, Messenger, Facebook, Instagram). The chat may be Bangla, English, or mixed. The JSON you return must be English only.

Return JSON only: {"orders":[...]}. Screenshots are numbered (Screenshot 1, Screenshot 2, …) and must be read together as one batch. If nothing is an order, return {"orders":[]}.

Batch rules:
- Several complete orders in one screenshot → several JSON objects.
- Name or phone on one screenshot and address or price on another → one order with those fields combined. Set source_image_indexes to every screenshot that contributed.
- Overlapping scroll of the same chat → one order, not two.
- Different recipient phone, or a clearly different COD or item for the same person → separate orders.
- Ignore greetings, stickers, and screenshots with no order data.
- If a stitch is uncertain, still return one candidate and add a warnings note. Never leave two half-orders.

Every text field must be clear, well-formatted English. No Bangla script. Transliterate names and places the customer actually wrote (রহিম → Rahim, উত্তরা → Uttara, ঠাকুরগাঁও → Thakurgaon, ঢাকা → Dhaka). Phone digits and amounts stay numbers.

Mandatory fields for each order (null if the chat does not contain them):
- recipient_name (English, Title Case)
- recipient_phone (11-digit Bangladeshi mobile starting with 01)
- recipient_address_as_written: the delivery address copied faithfully — same places, nothing extra. Transliterate only. Do not complete it with a city.
- recipient_address: the same places, organized into one clean English line.
- amount_to_collect (COD number, no currency symbols). Prepaid / already paid → 0. If the price is not in the chat, null — never invent a price.

Optional:
- item_quantity, item_weight (kg), item_desc, special_instruction, item_type ("parcel" or "document")
- warnings: short English notes about missing mandatory fields or an uncertain stitch
- source_image_indexes: 1-based screenshot numbers this order came from (e.g. [4, 5] if split across Screenshot 4 and 5)

Address rules (absolute):
- Copy the places in the screenshot. Organize into a readable line. Do not add any new place. Do not drop any place they wrote.
- Labels like Name / Add / Phn / নাম / এড্রেস / থানা are labels, not extra places.
- A thana, zone, or area is NOT a city. Never guess the parent city.
- WRONG: "থানা চকবাজার" / "Chawkbazar Thana" → adding Chittagong, Chattogram, or Dhaka. RIGHT: "Inside Women Madrasah, Chawkbazar Thana".
- WRONG: "H-1, Uttara" → "House 1, Uttara, Dhaka". RIGHT: "House 1, Uttara".
- RIGHT: "Add, uttor jahanpur, mitali stor, majortila, Sylhet" → "Uttar Jahanpur, Mitali Store, Majortila, Sylhet" (they wrote Sylhet — keep it).
- WRONG: dropping a city they did write. WRONG: adding Thakurgaon Sadar when they only wrote Thakurgaon.
- Expand abbreviations already present (H-1 → House 1, CTG → Chattogram). CTG is a city they wrote; a thana is not.
- Do not output Pathao city/zone/area IDs. There is no city field — if they named a city, it belongs in the address line.

Catalog may be used only for item_desc when the chat matches a product. Do not use catalog prices as the COD amount.
Catalog:
${catalog}
- Special instructions: English (call before delivery, evening only, landmarks they mentioned).
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

function uniqueIndexes(values: number[] | undefined): number[] {
  const next = new Set<number>();
  for (const value of values ?? []) {
    if (Number.isInteger(value) && value >= 1) next.add(value);
  }
  return [...next].sort((a, b) => a - b);
}

export function toAiOrder(row: z.infer<typeof orderSchema>): ExtractedAiOrder {
  return {
    recipient_name: row.recipient_name ?? null,
    recipient_phone: row.recipient_phone ?? null,
    recipient_address: row.recipient_address ?? null,
    recipient_address_as_written: row.recipient_address_as_written ?? null,
    amount_to_collect: row.amount_to_collect ?? null,
    item_quantity: row.item_quantity ?? null,
    item_weight: row.item_weight ?? null,
    item_desc: row.item_desc ?? null,
    special_instruction: row.special_instruction ?? null,
    item_type: row.item_type ?? null,
    warnings: row.warnings ?? [],
    source_image_indexes: uniqueIndexes(row.source_image_indexes),
  };
}

export function parseAiOrdersPayload(raw: unknown): ExtractedAiOrder[] {
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The model returned orders in an unexpected shape.");
  }
  return parsed.data.orders.map(toAiOrder);
}

function isRetryableAiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|500|502|503|504|timeout|timed out|rate limit|ECONNRESET|ENOTFOUND|network|fetch failed/i.test(
    message,
  );
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

  const screenshotParts: { type: "text" | "image_url"; text?: string; image_url?: { url: string } }[] =
    [];
  options.images.forEach((image, index) => {
    screenshotParts.push({
      type: "text",
      text: `Screenshot ${index + 1}:`,
    });
    screenshotParts.push({
      type: "image_url",
      image_url: { url: image.dataUrl },
    });
  });

  const userText = options.note?.trim()
    ? `Merchant note:\n${options.note.trim()}\n\nExtract every distinct order from these numbered screenshots together. Stitch an order split across screenshots into one object. Do not duplicate overlapping chat. Write every text field in English only. Keep every place they wrote. Do not add a city for a thana or zone.`
    : "Extract every distinct order from these numbered screenshots together. Stitch an order split across screenshots into one object. Do not duplicate overlapping chat. Write every text field in English only. Keep every place they wrote. Do not add a city for a thana or zone.";

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: buildSystemPrompt(options.products) },
      {
        role: "user",
        content: [{ type: "text", text: userText }, ...screenshotParts],
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
                  "recipient_address_as_written",
                  "amount_to_collect",
                  "item_quantity",
                  "item_weight",
                  "item_desc",
                  "special_instruction",
                  "item_type",
                  "warnings",
                  "source_image_indexes",
                ],
                properties: {
                  recipient_name: { type: ["string", "null"] },
                  recipient_phone: { type: ["string", "null"] },
                  recipient_address: { type: ["string", "null"] },
                  recipient_address_as_written: { type: ["string", "null"] },
                  amount_to_collect: { type: ["number", "null"] },
                  item_quantity: { type: ["number", "null"] },
                  item_weight: { type: ["number", "null"] },
                  item_desc: { type: ["string", "null"] },
                  special_instruction: { type: ["string", "null"] },
                  item_type: { type: ["string", "null"] },
                  warnings: { type: "array", items: { type: "string" } },
                  source_image_indexes: { type: "array", items: { type: "integer" } },
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
      const detail = json.error?.message || "AI request failed";
      throw new Error(`${detail} (${response.status})`);
    }
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("The model returned an empty response.");
    return extractJsonObject(content);
  }

  async function requestOnce(): Promise<unknown> {
    try {
      return await call(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/response_format|json_schema|unrecognized|unsupported/i.test(message)) {
        const fallback = { ...body };
        delete fallback.response_format;
        return await call(fallback);
      }
      throw error;
    }
  }

  let raw: unknown;
  try {
    raw = await requestOnce();
  } catch (error) {
    if (!isRetryableAiError(error)) throw error;
    raw = await requestOnce();
  }

  return {
    orders: parseAiOrdersPayload(raw),
    raw,
    model,
  };
}

export type OrderEnglishFields = {
  recipient_name: string;
  recipient_address: string;
  recipient_city: string;
  item_desc: string;
  special_instruction: string;
  warnings: string[];
};

const englishRowSchema = z.object({
  index: z.number(),
  recipient_name: z.string().nullable().optional(),
  recipient_address: z.string().nullable().optional(),
  recipient_city: z.string().nullable().optional(),
  item_desc: z.string().nullable().optional(),
  special_instruction: z.string().nullable().optional(),
  warnings: z.array(z.string()).nullable().optional(),
});

const englishPayloadSchema = z.object({
  orders: z.array(englishRowSchema),
});

function englishSystemPrompt(): string {
  return `You rewrite courier-order text into clear, well-formatted English. Every returned string must use English letters, digits, and punctuation only — no Bangla or other non-Latin script.

Return JSON only: {"orders":[{"index":0,"recipient_name":"...","recipient_address":"...","recipient_city":"...","item_desc":"...","special_instruction":"...","warnings":["..."]}]}.

For each order:
- recipient_name: proper English name, Title Case (রহিম → Rahim, মোঃ করিম → Md. Karim).
- recipient_address: rephrase into one clean English line. Keep every place already in the text, including a trailing city they wrote (Sylhet, Dhaka, Thakurgaon). Reorder, commas, spelling, and expand abbreviations already present (H-1 → House 1, CTG → Chattogram). Transliterate Bangla place names that are already there (উত্তরা → Uttara).
- recipient_city: translate the city field if it already has a value. If the city field is empty, leave it empty — do not fill it from a thana, zone, or geography (Chawkbazar is not Chittagong).
- item_desc and special_instruction: natural English of the same meaning.
- warnings: short English notes.

Rules:
- Rephrase only. Do not add facts, places, or details from your own knowledge. Do not drop places that are already in the input.
- NEVER add a city, zone, thana, area, district, house, road, landmark, or Sadar that is not already in the input.
- WRONG: address "House 1, Uttara" → "House 1, Uttara, Dhaka". RIGHT: "House 1, Uttara".
- WRONG: "Inside Women Madrasah, Chawkbazar Thana" → adding Chittagong or Chattogram.
- WRONG: dropping Sylhet from "Uttar Jahanpur, Mitali Store, Majortila, Sylhet".
- If a field is empty, return an empty string (and an empty warnings array).`;
}

function pickFormatted(formatted: string | null | undefined, original: string): string {
  const next = formatted?.replace(/\s+/g, " ").trim() ?? "";
  return next || original;
}

export async function formatOrdersInEnglish(options: {
  apiKey: string;
  provider?: string | null;
  baseUrl?: string | null;
  model?: string | null;
  rows: OrderEnglishFields[];
}): Promise<(OrderEnglishFields | null)[]> {
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
    ...row,
  }));

  const body: Record<string, unknown> = {
    model,
    temperature: 0,
    messages: [
      { role: "system", content: englishSystemPrompt() },
      {
        role: "user",
        content: `Rewrite these orders into English only. Rephrase for clarity. Do not add any place name, city, or landmark that is not already in the input:\n${JSON.stringify(payload)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "english_orders",
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
                  "index",
                  "recipient_name",
                  "recipient_address",
                  "recipient_city",
                  "item_desc",
                  "special_instruction",
                  "warnings",
                ],
                properties: {
                  index: { type: "integer" },
                  recipient_name: { type: ["string", "null"] },
                  recipient_address: { type: ["string", "null"] },
                  recipient_city: { type: ["string", "null"] },
                  item_desc: { type: ["string", "null"] },
                  special_instruction: { type: ["string", "null"] },
                  warnings: { type: "array", items: { type: "string" } },
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

  const parsed = englishPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("The model returned English orders in an unexpected shape.");
  }
  const byIndex = new Map(parsed.data.orders.map((row) => [row.index, row]));
  return options.rows.map((original, index) => {
    const formatted = byIndex.get(index);
    if (!formatted) return null;
    const warnings = (formatted.warnings ?? [])
      .map((warning) => warning.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return {
      recipient_name: pickFormatted(formatted.recipient_name, original.recipient_name),
      recipient_address: pickFormatted(formatted.recipient_address, original.recipient_address),
      recipient_city: original.recipient_city
        ? pickFormatted(formatted.recipient_city, original.recipient_city)
        : "",
      item_desc: pickFormatted(formatted.item_desc, original.item_desc),
      special_instruction: pickFormatted(
        formatted.special_instruction,
        original.special_instruction,
      ),
      warnings: warnings.length > 0 ? warnings : original.warnings,
    };
  });
}
