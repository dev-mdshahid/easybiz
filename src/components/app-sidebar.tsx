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
  SidebarSeparator,
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

function splitEmail(email: string) {
  const at = email.lastIndexOf("@");
  if (at <= 0) return { local: email, domain: "" };
  return { local: email.slice(0, at), domain: email.slice(at + 1) };
}

function initialsFromEmail(email: string) {
  const { local } = splitEmail(email);
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
  const { local, domain } = splitEmail(email);

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
      <SidebarFooter className="gap-0 px-3 pb-3">
        <SidebarSeparator className="mx-1 mb-2" />
        <div className="flex items-center gap-2 px-1 py-1">
          <Avatar className="size-8">
            <AvatarFallback className="text-[11px] font-semibold tracking-normal">
              {initialsFromEmail(email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1" title={email}>
            <p className="truncate text-sm font-medium leading-5 text-sidebar-foreground">
              {local}
            </p>
            {domain ? (
              <p className="truncate text-xs leading-4 text-muted-foreground">
                {domain}
              </p>
            ) : null}
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label="Log out"
              className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut />
            </Button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
