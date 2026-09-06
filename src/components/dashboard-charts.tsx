"use client";

import { useId, useMemo } from "react";

import type { DashboardStats } from "@/app/actions";
import {
  buildCostMix,
  buildWaterfall,
  type DashboardDay,
  type MixSlice,
  type WaterfallBar,
} from "@/lib/dashboard-series";
import { formatBdtCompact } from "@/lib/money";
import { formatDhakaDayShort } from "@/lib/time";
import { cn } from "@/lib/utils";

const MIX_PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function mixColor(slice: MixSlice, index: number) {
  if (slice.key === "profit") return "var(--primary)";
  return MIX_PALETTE[index % MIX_PALETTE.length];
}

function waterfallFill(bar: WaterfallBar) {
  if (bar.role === "total") return "var(--primary)";
  if (bar.role === "cost") return "var(--chart-3)";
  return "var(--chart-1)";
}

export function CollectedArea({
  series,
  tone = "default",
  className,
}: {
  series: DashboardDay[];
  tone?: "default" | "onPrimary";
  className?: string;
}) {
  const paintId = useId();
  const chart = useMemo(() => {
    if (series.length < 2) return null;
    const width = 720;
    const height = 220;
    const pad = { l: 2, r: 2, t: 10, b: 26 };
    const max = Math.max(...series.map((point) => point.collected), 1);
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const points = series.map((point, index) => {
      const x = pad.l + (index / (series.length - 1)) * innerW;
      const y = pad.t + innerH - (point.collected / max) * innerH;
      return { x, y, ...point };
    });
    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L${last.x.toFixed(1)} ${pad.t + innerH} L${first.x.toFixed(1)} ${pad.t + innerH} Z`;
    const ticks = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];
    return { width, height, pad, line, area, points, ticks, max };
  }, [series]);

  if (!chart) {
    return (
      <p className={cn("text-sm text-current/70", className)}>
        Collect a few more delivery days and this will plot collected over time.
      </p>
    );
  }

  const stroke = tone === "onPrimary" ? "var(--primary-foreground)" : "var(--primary)";
  const muted = tone === "onPrimary" ? "color-mix(in oklch, var(--primary-foreground) 70%, transparent)" : "var(--muted-foreground)";

  return (
    <figure className={cn("grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-1.5", className)}>
      <svg
        role="img"
        aria-label="Collected by day"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        preserveAspectRatio="none"
        className="h-full min-h-36 w-full"
      >
        <defs>
          <linearGradient id={paintId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={tone === "onPrimary" ? 0.35 : 0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={chart.area} fill={`url(#${paintId})`} />
        <path
          d={chart.line}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          className="chart-draw"
        />
        {chart.ticks.map((tick) => (
          <text
            key={tick.day}
            x={tick.x}
            y={chart.height - 6}
            textAnchor={tick === chart.ticks[0] ? "start" : tick === chart.ticks[2] ? "end" : "middle"}
            fill={muted}
            fontSize="11"
          >
            {formatDhakaDayShort(tick.day)}
          </text>
        ))}
      </svg>
      <figcaption className="text-xs text-current/70">
        Collected by consignment day · peak {formatBdtCompact(chart.max)}
      </figcaption>
    </figure>
  );
}

export function ProfitWaterfall({
  stats,
  activeKey,
  onActiveKey,
}: {
  stats: DashboardStats;
  activeKey: string | null;
  onActiveKey: (key: string | null) => void;
}) {
  const bars = useMemo(() => buildWaterfall(stats.statement), [stats.statement]);
  if (bars.length === 0) return null;

  const width = Math.max(360, bars.length * 72);
  const height = 220;
  const pad = { l: 8, r: 8, t: 20, b: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const values = bars.flatMap((bar) => [bar.from, bar.to]);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const gap = 10;
  const barW = Math.min(48, (innerW - gap * (bars.length - 1)) / bars.length);
  const yAt = (value: number) => pad.t + ((max - value) / span) * innerH;
  const zero = yAt(0);

  return (
    <svg
      role="img"
      aria-label="How profit was made"
      viewBox={`0 0 ${width} ${height}`}
      className="h-56 w-full"
    >
      <line
        x1={pad.l}
        x2={width - pad.r}
        y1={zero}
        y2={zero}
        stroke="currentColor"
        strokeOpacity="0.12"
      />
      {bars.map((bar, index) => {
        const x = pad.l + index * (barW + gap);
        const top = yAt(Math.max(bar.from, bar.to));
        const bottom = yAt(Math.min(bar.from, bar.to));
        const h = Math.max(2, bottom - top);
        const active = activeKey === bar.key;
        return (
          <g
            key={bar.key}
            className="cursor-pointer"
            onMouseEnter={() => onActiveKey(bar.key)}
            onMouseLeave={() => onActiveKey(null)}
            onFocus={() => onActiveKey(bar.key)}
            onBlur={() => onActiveKey(null)}
            tabIndex={0}
          >
            <rect
              x={x}
              y={top}
              width={barW}
              height={h}
              rx="6"
              fill={waterfallFill(bar)}
              opacity={activeKey && !active ? 0.38 : 1}
            />
            <text
              x={x + barW / 2}
              y={top - 6}
              textAnchor="middle"
              className="fill-foreground"
              fontSize="10"
            >
              {formatBdtCompact(bar.amount)}
            </text>
            <text
              x={x + barW / 2}
              y={height - 16}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {bar.label.length > 12 ? `${bar.label.slice(0, 11)}…` : bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CostMix({
  stats,
  activeKey,
  onActiveKey,
}: {
  stats: DashboardStats;
  activeKey: string | null;
  onActiveKey: (key: string | null) => void;
}) {
  const slices = useMemo(() => buildCostMix(stats), [stats]);
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">No mix to chart yet.</p>;
  }

  const radius = 54;
  const stroke = 22;
  const c = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
      <svg
        role="img"
        aria-label="Where collected went"
        viewBox="0 0 160 160"
        className="size-40 shrink-0"
      >
        <g transform="translate(80 80) rotate(-90)">
          {slices.map((slice, index) => {
            const len = (slice.amount / total) * c;
            const dash = `${len} ${c - len}`;
            const current = offset;
            offset += len;
            const active = activeKey === slice.key;
            return (
              <circle
                key={slice.key}
                r={radius}
                fill="none"
                stroke={mixColor(slice, index)}
                strokeWidth={stroke}
                strokeDasharray={dash}
                strokeDashoffset={-current}
                opacity={activeKey && !active ? 0.35 : 1}
                className="cursor-pointer"
                onMouseEnter={() => onActiveKey(slice.key)}
                onMouseLeave={() => onActiveKey(null)}
              />
            );
          })}
        </g>
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="11"
        >
          Collected
        </text>
        <text
          x="80"
          y="96"
          textAnchor="middle"
          className="fill-foreground font-semibold"
          fontSize="13"
        >
          {formatBdtCompact(stats.revenue)}
        </text>
      </svg>
      <ul className="grid min-w-0 flex-1 gap-1.5 text-sm">
        {slices.map((slice, index) => {
          const share = (slice.amount / total) * 100;
          const active = activeKey === slice.key;
          return (
            <li key={slice.key}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors",
                  active && "bg-muted",
                )}
                onMouseEnter={() => onActiveKey(slice.key)}
                onMouseLeave={() => onActiveKey(null)}
                onFocus={() => onActiveKey(slice.key)}
                onBlur={() => onActiveKey(null)}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: mixColor(slice, index) }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(share)}%
                </span>
                <span className="tabular-nums tracking-tight">
                  {formatBdtCompact(slice.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VolumeSplit({ stats }: { stats: DashboardStats }) {
  const total = stats.delivery_count + stats.return_count;
  if (total === 0) return null;
  const delivered = (stats.delivery_count / total) * 100;
  const returned = (stats.return_count / total) * 100;

  return (
    <div className="grid gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="bg-primary"
          style={{ width: `${delivered}%` }}
          title={`${stats.delivery_count} deliveries`}
        />
        <div
          className="bg-destructive/80"
          style={{ width: `${returned}%` }}
          title={`${stats.return_count} returns`}
        />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Delivered</dt>
          <dd className="font-medium tabular-nums tracking-tight">
            {stats.delivery_count}
            <span className="ml-1 text-muted-foreground">
              {Math.round(delivered)}%
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Returned</dt>
          <dd className="font-medium tabular-nums tracking-tight">
            {stats.return_count}
            <span className="ml-1 text-muted-foreground">
              {Math.round(returned)}%
            </span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
