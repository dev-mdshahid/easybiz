import { Suspense } from "react";
import { connection } from "next/server";

import { ShopPosition } from "@/components/shop-position";
import {
  DashboardBreakdown,
  DashboardHero,
} from "@/components/dashboard-period";
import { DashboardRangePicker } from "@/components/dashboard-range-picker";
import { EmptyBooks } from "@/components/kpi-cards";
import { DashboardSkeleton } from "@/components/page-skeletons";
import { RecentUploads } from "@/components/recent-uploads";
import {
  getCashPosition,
  getDashboardStats,
  getStockPosition,
  hasAnyBooks,
  listUploads,
} from "@/app/actions";
import { getBusinessContext } from "@/app/business-actions";
import { listLiabilities } from "@/app/liability-actions";
import {
  dashboardRangeBounds,
  parseDashboardRange,
  type DashboardRangeSearch,
} from "@/lib/dashboard-range";

async function DashboardBody({
  searchParams,
}: {
  searchParams: Promise<DashboardRangeSearch>;
}) {
  const params = await searchParams;
  await connection();
  const selected = parseDashboardRange(params);
  const range = dashboardRangeBounds(selected);
  const [{ current }, stats, cash, stock, uploads, loans, hasBooks] =
    await Promise.all([
      getBusinessContext(),
      getDashboardStats(range.from, range.to),
      getCashPosition(),
      getStockPosition(),
      listUploads(),
      listLiabilities(),
      hasAnyBooks(),
    ]);
  const empty = !current || !hasBooks;

  return (
    <>
      {empty ? (
        <EmptyBooks needsBusiness={!current} />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.8fr)] xl:items-stretch">
          <DashboardHero stats={stats} />
          <ShopPosition
            cash={cash}
            stock={stock}
            loans={loans}
            hasBusiness={Boolean(current)}
          />
        </div>
      )}

      {empty ? (
        <ShopPosition
          cash={cash}
          stock={stock}
          loans={loans}
          hasBusiness={Boolean(current)}
        />
      ) : (
        <DashboardBreakdown stats={stats} />
      )}

      <RecentUploads uploads={uploads} />
    </>
  );
}

export default function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardRangeSearch>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <div className="flex items-start justify-between gap-3">
        <h1 className="page-title">Dashboard</h1>
        <Suspense fallback={<div className="h-8 w-36 rounded-xl bg-muted" />}>
          <DashboardRangeControl searchParams={searchParams} />
        </Suspense>
      </div>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DashboardRangeControl({
  searchParams,
}: {
  searchParams: Promise<DashboardRangeSearch>;
}) {
  const params = await searchParams;
  const selected = parseDashboardRange(params);
  return <DashboardRangePicker value={selected} />;
}
