"use client";

import Link from "next/link";
import {
  useMarket,
  computeMarketState,
  formatTemp,
  formatEther,
  formatCityLabel,
} from "@/hooks/useWeatherMarket";

interface Props {
  marketId: bigint;
}

const STATUS_META = {
  open: { label: "OPEN", badge: "text-ritual-accent terminal-border px-2 py-0.5 bg-ritual-accent/10" },
  closed: {
    label: "CLOSED — AWAITING_RESOLUTION",
    badge: "text-ritual-yellow terminal-border px-2 py-0.5 bg-ritual-yellow/10",
  },
  resolvable: {
    label: "TEE_EXECUTING...",
    badge: "text-ritual-accent animate-pulse",
  },
  resolved: {
    label: "RESOLVED_ON_CHAIN",
    badge: "text-ritual-purple",
  },
};

export function MarketGridCard({ marketId }: Props) {
  const { data } = useMarket(marketId);
  const state = computeMarketState(data);

  if (!state) {
    return <div className="terminal-border bg-ritual-panel h-64 animate-pulse" />;
  }

  const meta = STATUS_META[state.status];
  const isExecuting = state.status === "resolvable";
  const isResolved = state.status === "resolved";

  return (
    <div
      className={`bg-ritual-panel flex flex-col group transition-colors duration-200 ${
        isExecuting ? "terminal-border-strong crt-glow" : "terminal-border hover:border-ritual-accent"
      }`}
    >
      <div
        className={`flex justify-between items-center px-4 py-2 border-b ${
          isExecuting ? "bg-ritual-accent/20 border-ritual-accent" : "border-ritual-border"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={isExecuting ? "animate-spin inline-block" : "on-chain-dot"} aria-hidden>
            {isExecuting ? "⟳" : ""}
          </span>
          <span className="text-[11px] tracking-widest">MARKET_ID: #{marketId.toString()}</span>
        </div>
        <span className={`text-[11px] tracking-widest ${meta.badge}`}>{meta.label}</span>
      </div>

      <div className="p-4 flex-1">
        <div className="mb-4">
          <h3 className="text-xl mb-1">{formatCityLabel(state.city)}</h3>
          <div className="text-xs text-ritual-muted">
            TARGET: &gt;{formatTemp(state.targetTemp)} // {new Date(Number(state.resolutionTime)).toLocaleDateString()}
          </div>
        </div>

        {isResolved ? (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-ritual-border/40 pb-1">
              <span className="text-ritual-muted opacity-60">RESULT</span>
              <span className={state.resultIsAbove ? "text-ritual-accent font-bold" : "text-ritual-red font-bold"}>
                {state.resultIsAbove ? "ABOVE_WIN" : "BELOW_WIN"}
              </span>
            </div>
            <div className="flex justify-between border-b border-ritual-border/40 pb-1">
              <span className="text-ritual-muted opacity-60">FINAL_TEMP</span>
              <span>{formatTemp(state.actualTemp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ritual-muted opacity-60">TOTAL_POT</span>
              <span>{formatEther(state.totalPot)} RITUAL</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-ritual-border/40 pb-1">
              <span className="text-ritual-muted opacity-60">ABOVE_POOL</span>
              <span className="text-ritual-accent">{formatEther(state.totalAbove)} RITUAL</span>
            </div>
            <div className="flex justify-between border-b border-ritual-border/40 pb-1">
              <span className="text-ritual-muted opacity-60">BELOW_POOL</span>
              <span className="text-ritual-red">{formatEther(state.totalBelow)} RITUAL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ritual-muted opacity-60">TOTAL_POT</span>
              <span>{formatEther(state.totalPot)} RITUAL</span>
            </div>
          </div>
        )}
      </div>

      <div className={`p-4 border-t ${isExecuting ? "bg-ritual-accent/10 border-ritual-accent" : "bg-ritual-accent/5 border-ritual-border"}`}>
        {isExecuting ? (
          <div className="text-[11px] text-center py-3 border border-dashed border-ritual-accent/50 opacity-60 italic">
            MARKET_LOCKED_FOR_RESOLUTION
          </div>
        ) : (
          <Link
            href={`/market/${marketId.toString()}`}
            className={`block w-full text-center text-[11px] font-bold py-3 uppercase tracking-widest transition-all active:scale-[0.98] ${
              isResolved
                ? "border border-ritual-purple/40 text-ritual-purple hover:bg-ritual-purple/20"
                : "border border-ritual-accent hover:bg-ritual-accent hover:text-ritual-bg"
            }`}
          >
            {isResolved ? "VIEW_ATTESTATION" : "EXECUTE_BET_V2"}
          </Link>
        )}
      </div>
    </div>
  );
}
