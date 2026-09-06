import { Suspense } from "react";
import { connection } from "next/server";

import { ShopPosition } from "@/components/shop-position";
import {
  DashboardBreakdown,
  DashboardHero,
} from "@/components/dashboard-period";
import { EmptyBooks } from "@/components/kpi-cards";
import { DashboardSkeleton } from "@/components/page-skeletons";
import { RecentUploads } from "@/components/recent-uploads";
import { getCashPosition, getDashboardStats, getStockPosition, listUploads } from "@/app/actions";
import { getBusinessContext } from "@/app/business-actions";
import { listLiabilities } from "@/app/liability-actions";
import { rangeFromPreset, type DatePreset } from "@/lib/time";

function asPreset(value: string | undefined): DatePreset {
  if (value === "month" || value === "30d" || value === "all") return value;
  return "all";
}

async function DashboardBody({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const params = await searchParams;
  await connection();
  const preset = asPreset(params.preset);
  const range = rangeFromPreset(preset);
  const [{ current }, stats, cash, stock, uploads, loans] = await Promise.all([
    getBusinessContext(),
    getDashboardStats(range.from, range.to),
    getCashPosition(),
    getStockPosition(),
    listUploads(),
    listLiabilities(),
  ]);
  const empty =
    stats.delivery_count + stats.return_count === 0 &&
    stats.logged_expenses === 0;

  return (
    <>
      {empty ? (
        <EmptyBooks needsBusiness={!current} />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.8fr)] xl:items-stretch">
          <DashboardHero stats={stats} preset={preset} />
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
  searchParams: Promise<{ preset?: string }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <h1 className="page-title">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
