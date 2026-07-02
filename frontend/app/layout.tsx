import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/layout/TopNav";
import { SideNav } from "@/components/layout/SideNav";
import { MobileNav } from "@/components/layout/MobileNav";
import { FooterStatusBar } from "@/components/layout/FooterStatusBar";

export const metadata: Metadata = {
  title: "RITUAL_WEATHER_MARKET // TERMINAL",
  description: "Bet on real-time weather resolved on-chain via Ritual HTTP precompile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Pass raw cookie string to the client Providers so it can call
  // cookieToInitialState(wagmiConfig, cookie) without importing wagmiConfig here.
  // (RainbowKit's getDefaultConfig is browser-only and cannot run in RSC bundle.)
  const cookie = headers().get("cookie");

  return (
    <html lang="en">
      <body className="min-h-screen bg-ritual-bg text-ritual-text font-mono antialiased">
        <Providers cookie={cookie}>
          <div className="scanline-overlay" />
          <TopNav />
          <SideNav />
          <main className="md:pl-56 pt-16 pb-16 min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8">{children}</div>
          </main>
          <MobileNav />
          <FooterStatusBar />
        </Providers>
      </body>
    </html>
  );
}
