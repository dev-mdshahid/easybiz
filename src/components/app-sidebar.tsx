"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Truck,
  Upload,
  Wallet,
} from "lucide-react";

import { signOut } from "@/app/auth-actions";
import { BusinessSwitcher } from "@/components/business-switcher";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { Business } from "@/lib/supabase/database.types";

const items = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/expected-orders", label: "Expected orders", icon: ClipboardList },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/upload", label: "Upload CSV", icon: Upload },
  { href: "/carriers", label: "Carriers", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  businesses,
  current,
  email,
}: {
  businesses: Business[];
  current: Business | null;
  email: string;
}) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-4">
        <BusinessSwitcher businesses={businesses} current={current} />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="gap-2 px-3 pb-4">
        <p className="truncate px-1 text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="h-8 w-full justify-start px-2 text-sm">
            <LogOut className="size-3.5" />
            Log out
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}
