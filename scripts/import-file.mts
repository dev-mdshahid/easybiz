import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { parsePathaoCsv } from "../src/lib/pathao-csv";
import type { Database } from "../src/lib/supabase/database.types";

function loadEnvLocal() {
  const text = readFileSync(resolve(".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const value = line.slice(i + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const filePath = process.argv[2];

if (!url || !key || !filePath) {
  console.error("Need env keys and a csv path");
  process.exit(1);
}

const buffer = readFileSync(filePath);
const parsed = parsePathaoCsv(buffer.toString("utf8"));
if (!parsed.ok) {
  console.error(parsed.message);
  process.exit(1);
}

const supabase = createClient<Database>(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sha256 = createHash("sha256").update(buffer).digest("hex");
const { data: upload, error: uploadError } = await supabase
  .from("csv_uploads")
  .insert({
    filename: basename(filePath),
    file_sha256: sha256,
    row_count: parsed.rows.length,
    status: "completed",
    error_count: parsed.errors.length,
  })
  .select("id")
  .single();

if (uploadError || !upload) {
  console.error(uploadError);
  process.exit(1);
}

const ids = parsed.rows.map((r) => r.consignment_id);
const { data: existingRows } = await supabase
  .from("pathao_invoices")
  .select("consignment_id")
  .in("consignment_id", ids);
const existing = new Set((existingRows ?? []).map((r) => r.consignment_id));
let insertedCount = 0;
let updatedCount = 0;
for (const row of parsed.rows) {
  if (existing.has(row.consignment_id)) updatedCount += 1;
  else insertedCount += 1;
}

const { error } = await supabase.from("pathao_invoices").upsert(
  parsed.rows.map((row) => ({ ...row, upload_id: upload.id })),
  { onConflict: "consignment_id" },
);
if (error) {
  console.error(error);
  process.exit(1);
}

await supabase
  .from("csv_uploads")
  .update({ inserted_count: insertedCount, updated_count: updatedCount })
  .eq("id", upload.id);

console.log({ insertedCount, updatedCount, uploadId: upload.id });
