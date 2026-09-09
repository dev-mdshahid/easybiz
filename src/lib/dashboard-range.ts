import {
  dhakaExclusiveRange,
  dhakaStartIso,
  formatDhakaDay,
  formatDhakaDayShort,
  todayDhaka,
} from "@/lib/time";

export const LAST_DAYS_MIN = 1;
export const LAST_DAYS_MAX = 1095;

export type DashboardRange =
  | { kind: "month" }
  | { kind: "all" }
  | { kind: "last"; days: number }
  | { kind: "custom"; from: string; to: string };

export type DashboardRangeSearch = {
  range?: string;
  days?: string;
  from?: string;
  to?: string;
  preset?: string;
};

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseYmd(value: string | undefined): string | null {
  if (!value) return null;
  const match = YMD.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function addDhakaDays(ymd: string, delta: number): string {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ymdToCalendarDate(ymd: string): Date {
  const [year, month, day] = ymd.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function calendarDateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDashboardRange(
  params: DashboardRangeSearch,
  today = todayDhaka(),
): DashboardRange {
  const fromParam = parseYmd(params.from);
  const toParam = parseYmd(params.to);
  if (fromParam || toParam) {
    if (!fromParam) return { kind: "month" };
    let from = fromParam;
    let to = toParam ?? today;
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    if (to > today) to = today;
    if (from > today) from = today;
    return { kind: "custom", from, to };
  }

  if (params.days != null && params.days !== "") {
    if (!/^\d+$/.test(params.days.trim())) return { kind: "month" };
    const days = Number(params.days);
    if (
      Number.isInteger(days) &&
      days >= LAST_DAYS_MIN &&
      days <= LAST_DAYS_MAX
    ) {
      return { kind: "last", days };
    }
    return { kind: "month" };
  }

  const token = params.range || params.preset;
  if (token === "all") return { kind: "all" };
  if (token === "month") return { kind: "month" };
  if (token === "30d") return { kind: "last", days: 30 };
  return { kind: "month" };
}

export function dashboardRangeHref(range: DashboardRange): string {
  if (range.kind === "month") return "/";
  if (range.kind === "all") return "/?range=all";
  if (range.kind === "last") return `/?days=${range.days}`;
  return `/?from=${range.from}&to=${range.to}`;
}

export function dashboardRangeBounds(
  range: DashboardRange,
  today = todayDhaka(),
): { from: string | null; to: string | null } {
  if (range.kind === "all") return { from: null, to: null };
  if (range.kind === "month") {
    const [year, month] = today.split("-").map(Number);
    return { from: dhakaStartIso(year, month, 1), to: null };
  }
  if (range.kind === "last") {
    const fromYmd = addDhakaDays(today, -(range.days - 1));
    const [year, month, day] = fromYmd.split("-").map(Number);
    return { from: dhakaStartIso(year, month, day), to: null };
  }
  return dhakaExclusiveRange(range.from, range.to);
}

export function dashboardRangeLabel(range: DashboardRange): string {
  if (range.kind === "month") return "This month";
  if (range.kind === "all") return "All time";
  if (range.kind === "last") {
    return range.days === 1 ? "Today" : `Last ${range.days} days`;
  }
  if (range.from === range.to) return formatDhakaDay(range.from);
  return `${formatDhakaDayShort(range.from)} – ${formatDhakaDay(range.to)}`;
}

export function rangesEqual(a: DashboardRange, b: DashboardRange): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "last" && b.kind === "last") return a.days === b.days;
  if (a.kind === "custom" && b.kind === "custom") {
    return a.from === b.from && a.to === b.to;
  }
  return true;
}
