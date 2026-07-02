"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  useMarket,
  useUserBets,
  useClaim,
  computeMarketState,
  formatCityLabel,
  formatEther,
} from "@/hooks/useWeatherMarket";

export interface BetEntry {
  marketId: bigint;
  city: string;
  side: "above" | "below";
  amount: bigint;
  status: "open" | "closed" | "resolvable" | "resolved";
  resolved: boolean;
  won: boolean;
  claimed: boolean;
}

interface Props {
  marketId: bigint;
  onEntries: (key: string, entries: BetEntry[]) => void;
}

/** Renders 0-2 <tr> rows (one per side the user has staked on) for a single market. */
export function MyBetRow({ marketId, onEntries }: Props) {
  const { data } = useMarket(marketId);
  const state = useMemo(() => computeMarketState(data), [data]);
  const { data: userBets, refetch: refetchBets } = useUserBets(marketId);
  const { claim, isPending, isConfirming, isSuccess } = useClaim(marketId);

  const entries: BetEntry[] = useMemo(() => {
    if (!state || !userBets) return [];
    const list: BetEntry[] = [];
    if (userBets[0] > BigInt(0)) {
      list.push({
        marketId, city: state.city, side: "above", amount: userBets[0],
        status: state.status, resolved: state.resolved,
        won: state.resolved && state.resultIsAbove, claimed: userBets[2],
      });
    }
    if (userBets[1] > BigInt(0)) {
      list.push({
        marketId, city: state.city, side: "below", amount: userBets[1],
        status: state.status, resolved: state.resolved,
        won: state.resolved && !state.resultIsAbove, claimed: userBets[2],
      });
    }
    return list;
  }, [state, userBets, marketId]);

  useEffect(() => {
    onEntries(marketId.toString(), entries);
  }, [entries, marketId, onEntries]);

  if (!state || entries.length === 0) return null;

  return (
    <>
      {entries.map((entry) => {
        const canClaim = entry.resolved && entry.won && !entry.claimed;
        const outcomeLabel = !entry.resolved
          ? "PENDING_TEE"
          : entry.won
          ? "RESOLVED: WIN"
          : "RESOLVED: LOSS";
        const outcomeColor = !entry.resolved
          ? "text-ritual-yellow border-ritual-yellow/30 bg-ritual-yellow/10"
          : entry.won
          ? "text-ritual-accent border-ritual-accent/30 bg-ritual-accent/10"
          : "text-ritual-red border-ritual-red/30 bg-ritual-red/10";

        return (
          <tr key={`${entry.marketId}-${entry.side}`} className="hover:bg-ritual-accent/5 transition-colors">
            <td className="px-4 py-4 text-xs opacity-80">#MKT_{entry.marketId.toString()}</td>
            <td className="px-4 py-4">
              <Link href={`/market/${entry.marketId.toString()}`} className="flex flex-col hover:text-ritual-accent">
                <span className="text-ritual-accent">{formatCityLabel(entry.city)}</span>
                <span className="text-[10px] opacity-40 uppercase">MARKET_#{entry.marketId.toString()}</span>
              </Link>
            </td>
            <td className="px-4 py-4">
              <span className={`border px-2 py-0.5 text-[11px] ${
                entry.side === "above"
                  ? "border-ritual-accent/40 text-ritual-accent bg-ritual-accent/5"
                  : "border-ritual-red/40 text-ritual-red bg-ritual-red/5"
              }`}>
                {entry.side.toUpperCase()}
              </span>
            </td>
            <td className="px-4 py-4 text-xs">{formatEther(entry.amount)} RIT</td>
            <td className="px-4 py-4">
              <div className={`inline-flex items-center gap-2 px-3 py-1 text-[11px] font-bold border ${outcomeColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {outcomeLabel}
              </div>
            </td>
            <td className="px-4 py-4 text-right">
              {canClaim ? (
                <button
                  onClick={() => claim().then(() => refetchBets())}
                  disabled={isPending || isConfirming || isSuccess}
                  className="border border-ritual-accent text-ritual-accent px-4 py-2 text-[11px]
                             hover:bg-ritual-accent hover:text-ritual-bg transition-all uppercase disabled:opacity-50"
                >
                  {isPending ? "CONFIRM..." : isConfirming ? "CLAIMING..." : isSuccess ? "CLAIMED!" : "[CLAIM_PAYOUT]"}
                </button>
              ) : entry.claimed ? (
                <span className="text-[10px] text-ritual-muted opacity-60 uppercase italic">CLAIMED</span>
              ) : (
                <button
                  disabled
                  className="opacity-30 border border-ritual-border text-ritual-muted px-4 py-2 text-[11px] uppercase cursor-not-allowed"
                >
                  {entry.resolved ? "[SETTLED]" : "[LOCKED]"}
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
