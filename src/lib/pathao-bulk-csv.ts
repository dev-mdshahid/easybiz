import Papa from "papaparse";

export const PATHAO_BULK_HEADERS = [
  "ItemType",
  "StoreName",
  "MerchantOrderId",
  "RecipientName(*)",
  "RecipientPhone(*)",
  "RecipientAddress(*)",
  "RecipientCity(*)",
  "RecipientZone(*)",
  "RecipientArea",
  "AmountToCollect(*)",
  "ItemQuantity",
  "ItemWeight",
  "ItemDesc",
  "SpecialInstruction",
] as const;

export type PathaoBulkRow = {
  item_type: string;
  store_name: string;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: string;
  recipient_zone: string;
  recipient_area: string;
  amount_to_collect: number | string;
  item_quantity: number | string;
  item_weight: number | string;
  item_desc: string;
  special_instruction: string;
};

function cell(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function buildPathaoBulkCsv(rows: PathaoBulkRow[]): string {
  const data = rows.map((row) => [
    cell(row.item_type),
    cell(row.store_name),
    cell(row.merchant_order_id),
    cell(row.recipient_name),
    cell(row.recipient_phone),
    cell(row.recipient_address),
    cell(row.recipient_city),
    cell(row.recipient_zone),
    cell(row.recipient_area),
    cell(row.amount_to_collect),
    cell(row.item_quantity),
    cell(row.item_weight),
    cell(row.item_desc),
    cell(row.special_instruction),
  ]);

  return Papa.unparse(
    {
      fields: [...PATHAO_BULK_HEADERS],
      data,
    },
    { newline: "\n" },
  );
}
