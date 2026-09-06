import { Suspense } from "react";

import { OrdersFilters } from "@/components/orders-filters";
import { OrdersSkeleton } from "@/components/page-skeletons";
import { OrdersTable, Pagination } from "@/components/orders-table";
import { listInvoices } from "@/app/actions";
import { rangeFromPreset, type DatePreset } from "@/lib/time";

function asPreset(value: string | undefined): DatePreset {
  if (value === "month" || value === "30d" || value === "all") return value;
  return "all";
}

async function OrdersBody({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    preset?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const invoiceType =
    params.type === "delivery" || params.type === "return" ? params.type : "all";
  const preset = asPreset(params.preset);
  const range = rangeFromPreset(preset);
  const page = Number(params.page ?? "1") || 1;

  const result = await listInvoices({
    q,
    invoiceType,
    from: range.from,
    to: range.to,
    page,
  });

  const hrefFor = (nextPage: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (invoiceType !== "all") search.set("type", invoiceType);
    if (preset !== "all") search.set("preset", preset);
    search.set("page", String(nextPage));
    return `/orders?${search.toString()}`;
  };

  return (
    <>
      <OrdersFilters q={q} invoiceType={invoiceType} preset={preset} />
      <OrdersTable rows={result.rows} />
      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        hrefFor={hrefFor}
      />
    </>
  );
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    preset?: string;
    page?: string;
  }>;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Every Pathao consignment saved from your CSVs.
        </p>
      </div>
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
