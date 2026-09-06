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
        <div className="mt-auto">
          <Skeleton className="mx-1 mb-2 h-px w-auto" />
          <div className="flex items-center gap-2 px-1 py-1">
            <Skeleton className="size-8 rounded-full" />
            <div className="grid min-w-0 flex-1 gap-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="size-7 rounded-lg" />
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-8">
      <div className="grid min-h-[22rem] gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.8fr)]">
        <div className="flex flex-col rounded-xl bg-primary/90 p-6">
          <Skeleton className="h-5 w-16 bg-primary-foreground/30" />
          <Skeleton className="mt-4 h-14 w-64 max-w-full bg-primary-foreground/40" />
          <Skeleton className="mt-3 h-4 w-48 bg-primary-foreground/25" />
          <div className="mt-5 grid grid-cols-4 gap-3">
            <Skeleton className="h-10 w-full bg-primary-foreground/20" />
            <Skeleton className="h-10 w-full bg-primary-foreground/20" />
            <Skeleton className="h-10 w-full bg-primary-foreground/20" />
            <Skeleton className="h-10 w-full bg-primary-foreground/20" />
          </div>
          <Skeleton className="mt-6 min-h-40 flex-1 w-full bg-primary-foreground/20" />
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-7 w-28" />
          </div>
          <Skeleton className="mt-4 h-2 w-full" />
          <Skeleton className="mt-3 h-2 w-2/3" />
          <div className="mt-5 grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-40 w-full" />
          <div className="mt-4 grid gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-4 h-32 w-full" />
          </div>
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="mt-4 h-16 w-full" />
          </div>
        </div>
      </div>
      <TableSkeleton rows={4} />
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
