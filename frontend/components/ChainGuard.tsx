"use client";
import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ritualChain } from "@/lib/chain";

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <>{children}</>;

  if (isConnected && chain?.id !== ritualChain.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="text-3xl text-ritual-yellow">&#9888;</div>
        <p className="text-ritual-muted text-sm">
          WRONG_NETWORK: connected to{" "}
          <span className="text-ritual-text">{chain?.name ?? "unknown chain"}</span>.
          Switch to Ritual Chain to use this terminal.
        </p>
        <button
          onClick={() => switchChain({ chainId: ritualChain.id })}
          disabled={isPending}
          className="px-5 py-2.5 bg-ritual-accent/10 border border-ritual-accent text-ritual-accent
                     text-sm uppercase tracking-widest hover:bg-ritual-accent/20 transition-colors disabled:opacity-50"
        >
          {isPending ? "SWITCHING..." : "[SWITCH_TO_RITUAL_CHAIN]"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
