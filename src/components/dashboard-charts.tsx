"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type { DashboardStats } from "@/app/actions";
import { DayConsignmentsDialog } from "@/components/day-consignments-dialog";
import {
  buildCostMix,
  buildWaterfall,
  type DashboardDay,
  type MixSlice,
  type WaterfallBar,
} from "@/lib/dashboard-series";
import { formatBdt, formatBdtCompact } from "@/lib/money";
import { formatDhakaDayRange, formatDhakaDayShort } from "@/lib/time";
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

type PlotPoint = DashboardDay & { x: number; y: number };

type CollectedChart = {
  width: number;
  height: number;
  pad: { l: number; r: number; t: number; b: number };
  line: string | null;
  area: string | null;
  points: PlotPoint[];
  ticks: PlotPoint[];
  max: number;
};

function buildCollectedChart(series: DashboardDay[]): CollectedChart | null {
  if (series.length === 0) return null;
  const width = 720;
  const height = 220;
  const pad = { l: 2, r: 2, t: 10, b: 26 };
  const max = Math.max(...series.map((point) => point.collected), 1);
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const span = Math.max(series.length - 1, 1);
  const points = series.map((point, index) => {
    const x =
      series.length === 1
        ? pad.l + innerW / 2
        : pad.l + (index / span) * innerW;
    const y = pad.t + innerH - (point.collected / max) * innerH;
    return { x, y, ...point };
  });
  const last = points[points.length - 1];
  const first = points[0];
  const line =
    points.length === 1
      ? null
      : points
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
          )
          .join(" ");
  const area =
    line == null
      ? null
      : `${line} L${last.x.toFixed(1)} ${pad.t + innerH} L${first.x.toFixed(1)} ${pad.t + innerH} Z`;
  const ticks =
    points.length === 1
      ? [points[0]]
      : points.length === 2
        ? [points[0], points[1]]
        : [
            points[0],
            points[Math.floor(points.length / 2)],
            points[points.length - 1],
          ];
  return { width, height, pad, line, area, points, ticks, max };
}

function nearestPointIndex(points: PlotPoint[], x: number) {
  let best = 0;
  let bestDist = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const dist = Math.abs(points[index].x - x);
    if (dist < bestDist) {
      best = index;
      bestDist = dist;
    }
  }
  return best;
}

function CollectedPointTooltip({
  plot,
  point,
  chart,
  visible,
}: {
  plot: HTMLElement | null;
  point: PlotPoint;
  chart: CollectedChart;
  visible: boolean;
}) {
  const [box, setBox] = useState<DOMRect | null>(null);

  const sync = useCallback(() => {
    if (!plot || !visible) {
      setBox(null);
      return;
    }
    setBox(plot.getBoundingClientRect());
  }, [plot, visible]);

  useLayoutEffect(() => {
    sync();
  }, [sync, point.x, point.y]);

  useEffect(() => {
    if (!visible) return;
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [sync, visible]);

  if (!visible || !box) return null;

  const left = box.left + (point.x / chart.width) * box.width;
  const top = box.top + (point.y / chart.height) * box.height;
  const nearStart = point.x / chart.width < 0.18;
  const nearEnd = point.x / chart.width > 0.82;
  const shift = nearStart ? "0%" : nearEnd ? "-100%" : "-50%";
  const label = formatDhakaDayRange(point.fromDay, point.toDay);

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 max-w-xs rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md"
      style={{
        left,
        top,
        transform: `translate(${shift}, calc(-100% - 10px))`,
      }}
    >
      <p className="font-medium">{label}</p>
      <p className="tabular-nums tracking-tight">{formatBdt(point.collected)}</p>
      <p className="text-background/75">
        {point.deliveries} {point.deliveries === 1 ? "delivery" : "deliveries"} ·{" "}
        {point.returns} {point.returns === 1 ? "return" : "returns"}
      </p>
    </div>,
    document.body,
  );
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
  const plotRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [openPoint, setOpenPoint] = useState<DashboardDay | null>(null);
  const [allowTooltip, setAllowTooltip] = useState(true);
  const chart = useMemo(() => buildCollectedChart(series), [series]);

  const hoverPoint =
    chart && hoverIndex != null ? chart.points[hoverIndex] : null;

  const indexFromClientX = useCallback(
    (clientX: number, target: HTMLElement) => {
      if (!chart) return 0;
      const rect = target.getBoundingClientRect();
      const x =
        ((clientX - rect.left) / Math.max(rect.width, 1)) * chart.width;
      return nearestPointIndex(chart.points, x);
    },
    [chart],
  );

  if (!chart) {
    return (
      <p className={cn("text-sm text-current/70", className)}>
        Collect a few more delivery days and this will plot collected over time.
      </p>
    );
  }

  const onPrimary = tone === "onPrimary";
  const stroke = onPrimary ? "var(--primary-foreground)" : "var(--primary)";
  const muted = onPrimary
    ? "color-mix(in oklch, var(--primary-foreground) 70%, transparent)"
    : "var(--muted-foreground)";
  const markerFill = onPrimary ? "var(--primary)" : "var(--background)";
  const markerStroke = stroke;
  const showTooltip = allowTooltip && hoverPoint != null && openPoint == null;

  return (
    <figure
      className={cn(
        "grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-1.5",
        className,
      )}
    >
      <div
        ref={plotRef}
        className="relative min-h-36 cursor-crosshair"
        onPointerDown={(event) => {
          setAllowTooltip(event.pointerType !== "touch");
          setHoverIndex(indexFromClientX(event.clientX, event.currentTarget));
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "touch") return;
          setAllowTooltip(true);
          setHoverIndex(indexFromClientX(event.clientX, event.currentTarget));
        }}
        onPointerLeave={() => {
          if (openPoint) return;
          setHoverIndex(null);
        }}
        onClick={(event) => {
          const index = indexFromClientX(event.clientX, event.currentTarget);
          const point = chart.points[index];
          if (point) setOpenPoint(point);
        }}
      >
        <svg
          role="img"
          aria-label="Collected by consignment day"
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          preserveAspectRatio="none"
          className="pointer-events-none h-full min-h-36 w-full"
        >
          <defs>
            <linearGradient id={paintId} x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor={stroke}
                stopOpacity={onPrimary ? 0.35 : 0.28}
              />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          {chart.area ? <path d={chart.area} fill={`url(#${paintId})`} /> : null}
          {chart.line ? (
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
          ) : null}
          {chart.ticks.map((tick, index) => (
            <text
              key={`${tick.day}-${tick.x}-${index}`}
              x={tick.x}
              y={chart.height - 6}
              textAnchor={
                index === 0 ? "start" : index === chart.ticks.length - 1 ? "end" : "middle"
              }
              fill={muted}
              fontSize="11"
            >
              {formatDhakaDayShort(tick.day)}
            </text>
          ))}
        </svg>

        {hoverPoint ? (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute top-0 bottom-7 w-px"
              style={{
                left: `${(hoverPoint.x / chart.width) * 100}%`,
                background: stroke,
                opacity: 0.28,
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute size-2.5 rounded-full"
              style={{
                left: `${(hoverPoint.x / chart.width) * 100}%`,
                top: `${(hoverPoint.y / chart.height) * 100}%`,
                transform: "translate(-50%, -50%)",
                background: markerFill,
                boxShadow: `0 0 0 2px ${markerStroke}`,
              }}
            />
          </>
        ) : null}

        {chart.points.map((point, index) => {
          const label = formatDhakaDayRange(point.fromDay, point.toDay);
          return (
            <button
              key={`${point.fromDay}-${point.toDay}-${index}`}
              type="button"
              className="absolute size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:outline-none"
              style={{
                left: `${(point.x / chart.width) * 100}%`,
                top: `${(point.y / chart.height) * 100}%`,
              }}
              aria-label={`${label}, ${formatBdt(point.collected)} collected. Open consignments.`}
              onFocus={() => {
                setAllowTooltip(true);
                setHoverIndex(index);
              }}
              onBlur={() => {
                if (openPoint) return;
                setHoverIndex(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                setOpenPoint(point);
              }}
            />
          );
        })}

        {hoverPoint ? (
          <CollectedPointTooltip
            plot={plotRef.current}
            point={hoverPoint}
            chart={chart}
            visible={showTooltip}
          />
        ) : null}
      </div>
      <figcaption className="text-xs text-current/70">
        Collected by consignment day · peak {formatBdtCompact(chart.max)}
      </figcaption>
      <DayConsignmentsDialog
        key={
          openPoint
            ? `${openPoint.fromDay}:${openPoint.toDay}:${openPoint.day}`
            : "closed"
        }
        point={openPoint}
        open={openPoint != null}
        onOpenChange={(next) => {
          if (!next) setOpenPoint(null);
        }}
      />
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
