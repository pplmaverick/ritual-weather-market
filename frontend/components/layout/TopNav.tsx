"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const ConnectButtonClient = dynamic(
  () => import("@/components/ConnectButton").then((m) => m.ConnectButton),
  { ssr: false, loading: () => <div className="h-9 w-40 terminal-border animate-pulse" /> },
);

const NAV_LINKS = [
  { href: "/", label: "MARKETS" },
  { href: "/my-bets", label: "MY_BETS" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ritual-bg border-b border-ritual-border h-16 flex items-center justify-between gap-4 px-4 md:px-6">
      <div className="flex items-center gap-8 min-w-0">
        <Link href="/" className="font-bold text-lg text-ritual-accent tracking-tighter truncate">
          <span className="md:hidden">RITUAL_WM</span>
          <span className="hidden md:inline">RITUAL_WEATHER_MARKET</span>
        </Link>
        <div className="hidden md:flex gap-6">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[11px] uppercase tracking-widest h-16 flex items-center transition-colors ${
                  active
                    ? "text-ritual-accent font-bold border-b-2 border-ritual-accent"
                    : "text-ritual-muted hover:text-ritual-accent"
                }`}
              >
                {link.label}
                {active && <span className="blinking-cursor" />}
              </Link>
            );
          })}
        </div>
      </div>
      <div suppressHydrationWarning className="flex-shrink-0">
        <ConnectButtonClient />
      </div>
    </nav>
  );
}
