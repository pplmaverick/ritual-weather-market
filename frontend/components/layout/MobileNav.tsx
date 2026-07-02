"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "MARKETS", glyph: "▣" },
  { href: "/my-bets", label: "BETS", glyph: "≡" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-8 left-0 w-full bg-ritual-bg border-t border-ritual-border flex justify-around items-center py-2 z-40">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 ${active ? "text-ritual-accent" : "text-ritual-muted"}`}
          >
            <span aria-hidden>{item.glyph}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
