"use client";

import { useEffect, useRef, useState } from "react";

import { listInvoices } from "@/app/actions";
import { OrdersTable } from "@/components/orders-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardDay } from "@/lib/dashboard-series";
import { formatBdt } from "@/lib/money";
import { dhakaExclusiveRange, formatDhakaDayRange } from "@/lib/time";
import type { PathaoInvoice } from "@/lib/supabase/database.types";

const PAGE_SIZE = 50;

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      rows: PathaoInvoice[];
      total: number;
      page: number;
      pageSize: number;
    };

export function DayConsignmentsDialog({
  point,
  open,
  onOpenChange,
}: {
  point: DashboardDay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);
  const [retryTick, setRetryTick] = useState(0);
  const [load, setLoad] = useState<LoadState>({ status: "idle" });
  const requestId = useRef(0);
  const pointKey = point
    ? `${point.fromDay}:${point.toDay}:${point.day}`
    : "";

  useEffect(() => {
    setPage(1);
  }, [pointKey]);

  useEffect(() => {
    if (!open || !point) {
      setLoad({ status: "idle" });
      return;
    }

    const id = ++requestId.current;
    let cancelled = false;
    setLoad({ status: "loading" });
    const range = dhakaExclusiveRange(point.fromDay, point.toDay);

    listInvoices({
      from: range.from,
      to: range.to,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((result) => {
        if (cancelled || id !== requestId.current) return;
        setLoad({
          status: "ready",
          rows: result.rows,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
        });
      })
      .catch((error: unknown) => {
        if (cancelled || id !== requestId.current) return;
        setLoad({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not load consignments.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [open, point, page, retryTick]);

  const label = point
    ? formatDhakaDayRange(point.fromDay, point.toDay)
    : "";
  const isRange = Boolean(point && point.fromDay !== point.toDay);
  const pages =
    load.status === "ready"
      ? Math.max(1, Math.ceil(load.total / load.pageSize))
      : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {label ? `Consignments · ${label}` : "Consignments"}
          </DialogTitle>
          <DialogDescription>
            {point
              ? `${formatBdt(point.collected)} collected · ${point.deliveries} ${
                  point.deliveries === 1 ? "delivery" : "deliveries"
                } · ${point.returns} ${
                  point.returns === 1 ? "return" : "returns"
                }`
              : "Consignments for the selected day."}
          </DialogDescription>
        </DialogHeader>

        {load.status === "loading" || load.status === "idle" ? (
          <div className="grid gap-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : null}

        {load.status === "error" ? (
          <div className="grid gap-3">
            <p className="text-sm text-destructive">{load.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setRetryTick((tick) => tick + 1)}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {load.status === "ready" && load.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isRange
              ? "No consignments in this range."
              : "No consignments on this day."}
          </p>
        ) : null}

        {load.status === "ready" && load.total > 0 ? (
          <div className="grid gap-3 overflow-x-auto">
            <OrdersTable rows={load.rows} />
            {pages > 1 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {load.total} invoices · page {load.page} of {pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={load.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={load.page >= pages}
                    onClick={() =>
                      setPage((current) => Math.min(pages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
