"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Landmark,
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
import { BrandMark } from "@/components/brand-mark";
import { BusinessSwitcher } from "@/components/business-switcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Business } from "@/lib/supabase/database.types";

const groups = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Work",
    items: [
      { href: "/orders", label: "Orders", icon: Receipt },
      { href: "/expected-orders", label: "Expected orders", icon: ClipboardList },
      { href: "/inventory", label: "Inventory", icon: Package },
    ],
  },
  {
    label: "Books",
    items: [
      { href: "/expenses", label: "Expenses", icon: Wallet },
      { href: "/liabilities", label: "Liabilities", icon: Landmark },
    ],
  },
  {
    label: "Tools",
    items: [
      { href: "/upload", label: "Upload CSV", icon: Upload },
      { href: "/carriers", label: "Carriers", icon: Truck },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "?";
}

function SidebarLinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`ml-auto size-1.5 rounded-full bg-current transition-opacity ${
        pending ? "opacity-70" : "opacity-0"
      }`}
    />
  );
}

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
    <Sidebar variant="floating" className="p-3">
      <SidebarHeader className="gap-3 px-3 pt-3">
        <div className="flex items-center gap-2.5 px-0.5">
          <BrandMark />
          <span className="font-heading text-lg leading-none font-extrabold tracking-tight">
            EasyBiz
          </span>
        </div>
        <BusinessSwitcher businesses={businesses} current={current} />
      </SidebarHeader>
      <SidebarContent className="px-1">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="px-2 py-1.5">
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={active}
                        render={<Link href={item.href} />}
                      >
                        <span className="flex size-7 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground transition-colors group-data-active/menu-button:bg-sidebar-primary-foreground/20 group-data-active/menu-button:text-sidebar-primary-foreground">
                          <item.icon />
                        </span>
                        <span>{item.label}</span>
                        <SidebarLinkPending />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-3 pb-3">
        <div className="rounded-2xl bg-sidebar-accent/70 p-2">
          <div className="flex items-center gap-2.5 px-1 py-1">
            <Avatar className="size-8 ring-2 ring-background">
              <AvatarFallback>{initialsFromEmail(email)}</AvatarFallback>
            </Avatar>
            <p
              className="min-w-0 flex-1 truncate text-xs font-medium text-sidebar-foreground"
              title={email}
            >
              {email}
            </p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="mt-1 h-8 w-full justify-start rounded-xl px-2 text-sm text-sidebar-foreground hover:bg-background/80"
            >
              <LogOut className="size-3.5" />
              Log out
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
