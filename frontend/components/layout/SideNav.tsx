"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBlockNumber } from "wagmi";

const NAV_ITEMS = [
  { href: "/", label: "MARKETS", glyph: "▣" },
  { href: "/my-bets", label: "MY_BETS", glyph: "≡" },
];

export function SideNav() {
  const pathname = usePathname();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  return (
    <aside className="hidden md:flex fixed left-0 top-16 bottom-0 flex-col z-40 bg-ritual-bg w-56 border-r border-ritual-border">
      <div className="px-6 py-8 border-b border-ritual-border">
        <h2 className="text-sm font-bold text-ritual-accent">WEATHER_MARKET</h2>
        <p className="text-[10px] text-ritual-muted mt-1">TEE_TERMINAL_V1</p>
      </div>
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-6 py-4 text-[11px] tracking-widest transition-colors border-l-4 ${
                active
                  ? "text-ritual-accent bg-ritual-accent/10 border-ritual-accent"
                  : "text-ritual-muted border-transparent hover:bg-ritual-accent/5 hover:text-ritual-accent"
              }`}
            >
              <span aria-hidden>{item.glyph}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-6 border-t border-ritual-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="on-chain-dot" />
          <span className="text-[10px] text-ritual-muted tracking-widest">BLOCK_HEIGHT</span>
        </div>
        <div className="text-sm text-ritual-accent" suppressHydrationWarning>
          {blockNumber !== undefined ? blockNumber.toString() : "..."}
        </div>
      </div>
    </aside>
  );
}
