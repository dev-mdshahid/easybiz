import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";

import { getSessionEmail, requireUserId } from "@/app/auth-actions";
import { getBusinessContext } from "@/app/business-actions";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarSkeleton } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

async function AppSidebarLoader() {
  await connection();
  await requireUserId();
  const email = (await getSessionEmail()) ?? "";
  const { businesses, current } = await getBusinessContext();
  return <AppSidebar businesses={businesses} current={current} email={email} />;
}

async function CurrentBusinessName() {
  await connection();
  const { current } = await getBusinessContext();
  return (
    <span className="text-sm font-medium text-foreground/70">
      {current ? current.name : "EasyBiz"}
    </span>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense fallback={<AppSidebarSkeleton />}>
        <AppSidebarLoader />
      </Suspense>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 px-4">
          <SidebarTrigger className="rounded-xl" />
          <Suspense fallback={<Skeleton className="h-4 w-24" />}>
            <CurrentBusinessName />
          </Suspense>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
