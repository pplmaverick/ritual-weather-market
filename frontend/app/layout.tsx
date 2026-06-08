import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Weather Market — Ritual Chain",
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
          <nav className="border-b border-ritual-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-ritual-orange font-bold text-lg">&#9681;</span>
              <span className="text-sm font-bold tracking-wider text-white">WEATHER MARKET</span>
              <span className="text-xs text-ritual-muted border border-ritual-border rounded px-2 py-0.5">
                Ritual Chain
              </span>
            </div>
            <ConnectButtonWrapper />
          </nav>
          <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
          <footer className="border-t border-ritual-border px-6 py-4 text-center text-xs text-ritual-muted">
            Weather resolved on-chain via Ritual HTTP precompile (0x0801) · No oracle needed
          </footer>
        </Providers>
      </body>
    </html>
  );
}

function ConnectButtonWrapper() {
  return (
    <div suppressHydrationWarning>
      <ConnectButtonClient />
    </div>
  );
}

const ConnectButtonClient = dynamic(
  () => import("@/components/ConnectButton").then((m) => m.ConnectButton),
  { ssr: false, loading: () => <div className="h-9 w-36 bg-ritual-surface rounded animate-pulse" /> },
);
