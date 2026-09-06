import { Sidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

function PageFrame({
  children,
  wide = true,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide
          ? "mx-auto flex w-full max-w-6xl flex-col gap-6"
          : "mx-auto flex w-full max-w-4xl flex-col gap-6"
      }
    >
      {children}
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-8 w-36" />
      <Skeleton className="mt-2 h-3 w-48" />
    </div>
  );
}

export function FormCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-2 h-3 w-56" />
      <div className="mt-4 grid gap-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <div className="grid grid-cols-4 gap-3 border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-14" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="grid grid-cols-4 gap-3 border-b px-4 py-3 last:border-0"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="mt-2 h-3 w-40" />
      <ul className="mt-4 grid gap-2">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0"
          >
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AppSidebarSkeleton() {
  return (
    <Sidebar variant="floating" className="p-3">
      <div className="flex h-full w-full flex-col gap-3 p-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-2xl" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <div className="mt-2 grid gap-4">
          {Array.from({ length: 4 }, (_, group) => (
            <div key={group} className="grid gap-2">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: group === 0 ? 1 : 3 }, (_, index) => (
                <div key={index} className="flex h-10 items-center gap-2.5 px-1.5">
                  <Skeleton className="size-7 rounded-lg" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-auto rounded-2xl bg-sidebar-accent/70 p-2">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="mt-1 h-8 w-full rounded-xl" />
        </div>
      </div>
    </Sidebar>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <Skeleton className="h-5 w-20" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      </section>
      <section className="grid gap-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-4 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <KpiCardSkeleton />
          </div>
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      </section>
      <ListSkeleton />
    </div>
  );
}

export function OrdersSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <TableSkeleton rows={8} />
    </div>
  );
}

export function ExpectedOrdersSkeleton() {
  return (
    <div className="grid gap-6">
      <FormCardSkeleton />
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="mt-4">
          <TableSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

export function InventorySkeleton() {
  return (
    <div className="grid gap-6">
      <KpiCardSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <FormCardSkeleton />
        <FormCardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}

export function ExpensesSkeleton() {
  return (
    <div className="grid gap-6">
      <FormCardSkeleton />
      <TableSkeleton />
    </div>
  );
}

export function UploadSkeleton() {
  return <ListSkeleton />;
}

export function CarriersSkeleton() {
  return <FormCardSkeleton />;
}

export function SettingsSkeleton() {
  return (
    <div className="grid gap-6">
      <FormCardSkeleton />
      <FormCardSkeleton />
    </div>
  );
}

export function AppPageFallback() {
  return (
    <PageFrame>
      <div className="grid gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <OrdersSkeleton />
    </PageFrame>
  );
}
