"use client";

import { useBlockNumber } from "wagmi";

export function FooterStatusBar() {
  const { data: blockNumber } = useBlockNumber({ watch: true });

  return (
    <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-8 bg-ritual-bg border-t border-ritual-border text-[10px] text-ritual-muted">
      <div className="flex gap-4 truncate" suppressHydrationWarning>
        <span>SYSTEM_STATUS: [ONLINE]</span>
        <span className="hidden md:inline">//</span>
        <span className="hidden md:inline">TEE_UPTIME: 99.99%</span>
        <span className="hidden md:inline">//</span>
        <span className="hidden md:inline">
          BLOCK: {blockNumber !== undefined ? blockNumber.toString() : "..."}
        </span>
      </div>
      <div className="hidden sm:flex gap-4">
        <a
          href="https://explorer.ritualfoundation.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ritual-accent transition-colors"
        >
          NETWORK
        </a>
        <a
          href="https://faucet.ritualfoundation.org"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ritual-accent transition-colors"
        >
          FAUCET
        </a>
      </div>
    </footer>
  );
}
