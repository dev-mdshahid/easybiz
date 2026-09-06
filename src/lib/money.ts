const bdt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBdt(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}৳${bdt.format(Math.abs(value))}`;
}

const compact = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export function formatBdtCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 100000) {
    return `${sign}৳${compact.format(abs / 1000)}k`;
  }
  if (abs >= 1000) {
    return `${sign}৳${compact.format(abs / 1000)}k`;
  }
  return `${sign}৳${compact.format(abs)}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded}%`;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}
