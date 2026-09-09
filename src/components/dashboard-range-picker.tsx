"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LAST_DAYS_MAX,
  LAST_DAYS_MIN,
  calendarDateToYmd,
  dashboardRangeHref,
  dashboardRangeLabel,
  rangesEqual,
  ymdToCalendarDate,
  type DashboardRange,
} from "@/lib/dashboard-range";
import { todayDhaka } from "@/lib/time";
import { cn } from "@/lib/utils";

const CHIPS: { label: string; range: DashboardRange }[] = [
  { label: "This month", range: { kind: "month" } },
  { label: "Last 7 days", range: { kind: "last", days: 7 } },
  { label: "Last 30 days", range: { kind: "last", days: 30 } },
  { label: "All time", range: { kind: "all" } },
];

export function DashboardRangePicker({ value }: { value: DashboardRange }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [daysDraft, setDaysDraft] = useState(
    value.kind === "last" ? String(value.days) : "30",
  );
  const [picked, setPicked] = useState<DateRange | undefined>(() =>
    customToDateRange(value),
  );

  const today = todayDhaka();
  const todayDate = useMemo(() => ymdToCalendarDate(today), [today]);
  const daysValid = parseLastDays(daysDraft);

  function go(next: DashboardRange) {
    startTransition(() => {
      router.push(dashboardRangeHref(next));
    });
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setDaysDraft(value.kind === "last" ? String(value.days) : "30");
          setPicked(customToDateRange(value));
        }
      }}
    >
      <PopoverTrigger
        disabled={pending}
        render={
          <Button
            type="button"
            variant="outline"
            className="max-w-full gap-2 rounded-xl"
            aria-label={`Period: ${dashboardRangeLabel(value)}`}
          />
        }
      >
        <CalendarDays className="size-4 text-muted-foreground" />
        <span className="truncate">{dashboardRangeLabel(value)}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(calc(100vw-2rem),22rem)] gap-3 p-3 sm:w-[22rem]"
      >
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => {
            const active = rangesEqual(value, chip.range);
            return (
              <Button
                key={chip.label}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="rounded-lg"
                onClick={() => go(chip.range)}
              >
                {chip.label}
              </Button>
            );
          })}
        </div>

        <form
          className="grid gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (daysValid == null) return;
            go({ kind: "last", days: daysValid });
          }}
        >
          <Label htmlFor="dashboard-last-days">Last</Label>
          <div className="flex gap-2">
            <Input
              id="dashboard-last-days"
              inputMode="numeric"
              pattern="[0-9]*"
              min={LAST_DAYS_MIN}
              max={LAST_DAYS_MAX}
              value={daysDraft}
              aria-invalid={daysDraft !== "" && daysValid == null}
              onChange={(event) => setDaysDraft(event.target.value)}
              className="w-24"
            />
            <span className="self-center text-sm text-muted-foreground">
              days
            </span>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={daysValid == null}
              className="ml-auto"
            >
              Apply
            </Button>
          </div>
        </form>

        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Custom range</p>
          <Calendar
            mode="range"
            timeZone="UTC"
            numberOfMonths={1}
            selected={picked}
            onSelect={setPicked}
            disabled={{ after: todayDate }}
            className={cn("rounded-xl bg-transparent p-0")}
          />
          <Button
            type="button"
            size="sm"
            disabled={!picked?.from}
            onClick={() => {
              if (!picked?.from) return;
              const from = calendarDateToYmd(picked.from);
              const to = calendarDateToYmd(picked.to ?? picked.from);
              go({ kind: "custom", from, to });
            }}
          >
            Apply dates
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function parseLastDays(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const days = Number(value);
  if (
    !Number.isInteger(days) ||
    days < LAST_DAYS_MIN ||
    days > LAST_DAYS_MAX
  ) {
    return null;
  }
  return days;
}

function customToDateRange(range: DashboardRange): DateRange | undefined {
  if (range.kind !== "custom") return undefined;
  return {
    from: ymdToCalendarDate(range.from),
    to: ymdToCalendarDate(range.to),
  };
}
