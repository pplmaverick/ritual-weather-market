"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { ritualChain } from "@/lib/chain";

export function ChainGuard({ children }: { children: React.ReactNode }) {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (isConnected && chain?.id !== ritualChain.id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="text-3xl">&#9888;</div>
        <p className="text-ritual-muted text-sm">
          You are on <span className="text-white">{chain?.name}</span>.
          Switch to Ritual Chain to use this app.
        </p>
        <button
          onClick={() => switchChain({ chainId: ritualChain.id })}
          disabled={isPending}
          className="px-5 py-2.5 bg-ritual-orange/10 border border-ritual-orange text-ritual-orange
                     text-sm rounded hover:bg-ritual-orange/20 transition-colors disabled:opacity-50"
        >
          {isPending ? "Switching..." : "Switch to Ritual Chain"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
