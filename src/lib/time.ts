export const DHAKA_TZ = "Asia/Dhaka";

const dhakaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: DHAKA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDhakaDayShort(ymd: string): string {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return ymd;
  const iso = dhakaStartIso(year, month, day);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TZ,
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")}`;
}

export function formatDhakaDay(ymd: string): string {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return ymd;
  const iso = dhakaStartIso(year, month, day);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("year")}`;
}

export function formatDhaka(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")}`;
}

export function todayDhaka(): string {
  return dhakaDate.format(new Date());
}

export function dhakaYmd(iso: string): string {
  return dhakaDate.format(new Date(iso));
}

function ymdParts(date: Date): { y: number; m: number; d: number } {
  const [y, m, d] = dhakaDate.format(date).split("-").map(Number);
  return { y, m, d };
}

export function dhakaStartIso(y: number, m: number, d: number): string {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}T00:00:00+06:00`;
}

export function startOfMonthDhakaIso(): string {
  const { y, m } = ymdParts(new Date());
  return dhakaStartIso(y, m, 1);
}

export function daysAgoDhakaIso(days: number): string {
  const now = new Date();
  const shifted = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const { y, m, d } = ymdParts(shifted);
  return dhakaStartIso(y, m, d);
}

export type DatePreset = "all" | "month" | "30d";

export function rangeFromPreset(preset: DatePreset): {
  from: string | null;
  to: string | null;
} {
  if (preset === "month") return { from: startOfMonthDhakaIso(), to: null };
  if (preset === "30d") return { from: daysAgoDhakaIso(30), to: null };
  return { from: null, to: null };
}
