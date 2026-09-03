import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getBusinessContext } from "@/app/business-actions";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EasyBiz",
  description: "Track Pathao payouts, fees, and net profit across businesses.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { businesses, current } = await getBusinessContext();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-background font-sans text-foreground"
      >
        <Providers>
          <SidebarProvider>
            <AppSidebar businesses={businesses} current={current} />
            <SidebarInset>
              <header className="flex h-14 items-center gap-2 border-b px-4">
                <SidebarTrigger />
                <span className="text-sm text-muted-foreground">
                  {current ? `${current.name} books` : "EasyBiz"}
                </span>
              </header>
              <div className="flex-1 p-4 md:p-6">{children}</div>
            </SidebarInset>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
