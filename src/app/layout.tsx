import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  Be_Vietnam_Pro,
  Bricolage_Grotesque,
  Geist_Mono,
  Noto_Sans_Bengali,
} from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoBengali = Noto_Sans_Bengali({
  variable: "--font-noto-bengali",
  subsets: ["bengali"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EasyBiz",
  description: "Track Pathao payouts, fees, and net profit across businesses.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${beVietnam.variable} ${notoBengali.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-background font-sans text-foreground"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
