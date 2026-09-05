import type { ReactNode } from "react";

import { getSessionEmail, requireUserId } from "@/app/auth-actions";
import { getBusinessContext } from "@/app/business-actions";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUserId();
  const email = (await getSessionEmail()) ?? "";
  const { businesses, current } = await getBusinessContext();

  return (
    <SidebarProvider>
      <AppSidebar businesses={businesses} current={current} email={email} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">
            {current ? current.name : "EasyBiz"}
          </span>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
