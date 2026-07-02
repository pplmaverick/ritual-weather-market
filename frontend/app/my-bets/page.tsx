"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useAccount } from "wagmi";
import { useMarketCount, formatEther } from "@/hooks/useWeatherMarket";
import { MARKET_ADDRESS, HTTP_PRECOMPILE } from "@/lib/addresses";
import type { BetEntry } from "@/components/MyBetRow";

const ChainGuard = dynamic(() => import("@/components/ChainGuard").then((m) => m.ChainGuard), { ssr: false });
const MyBetRow   = dynamic(() => import("@/components/MyBetRow").then((m) => m.MyBetRow), { ssr: false });

export default function MyBetsPage() {
  return (
    <ChainGuard>
      <MyBets />
    </ChainGuard>
  );
}

function MyBets() {
  const { isConnected } = useAccount();
  const { data: count } = useMarketCount();
  const [entriesByMarket, setEntriesByMarket] = useState<Record<string, BetEntry[]>>({});

  const onEntries = useCallback((key: string, entries: BetEntry[]) => {
    setEntriesByMarket((prev) => {
      const existing = prev[key];
      if (existing === entries || (existing?.length === 0 && entries.length === 0)) return prev;
      return { ...prev, [key]: entries };
    });
  }, []);

  const allEntries = useMemo(
    () => Object.values(entriesByMarket).flat().sort((a, b) => Number(b.marketId - a.marketId)),
    [entriesByMarket],
  );

  const stats = useMemo(() => {
    const totalVolume = allEntries.reduce((sum, e) => sum + e.amount, BigInt(0));
    const resolved = allEntries.filter((e) => e.resolved);
    const wins = resolved.filter((e) => e.won);
    const winRate = resolved.length > 0 ? ((wins.length / resolved.length) * 100).toFixed(1) : "—";
    const active = allEntries.filter((e) => !e.resolved).length;
    return { totalVolume, winRate, active, total: allEntries.length };
  }, [allEntries]);

  const marketIds = count !== undefined
    ? Array.from({ length: Number(count) }, (_, i) => BigInt(i))
    : [];

  const isContractMissing = MARKET_ADDRESS === "0x0000000000000000000000000000000000000000";

  if (!isConnected) {
    return <p className="text-ritual-muted text-sm">CONNECT_WALLET_TO_VIEW_YOUR_OPERATIONS</p>;
  }

  if (isContractMissing) {
    return <p className="text-ritual-yellow text-sm">CONTRACT_NOT_DEPLOYED</p>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl text-ritual-accent flex items-center gap-2">
            [MY_OPERATIONS_HISTORY]
            <span className="blinking-cursor" />
          </h1>
          <p className="text-xs text-ritual-muted opacity-70">
            DISPLAYING_ALL_ACTIVE_AND_RESOLVED_POSITIONS_ON_RITUAL_TEE
          </p>
        </div>
        <div className="flex gap-4">
          <div className="terminal-border p-2 flex flex-col items-end">
            <span className="text-[10px] text-ritual-muted uppercase">TOTAL_VOLUME</span>
            <span className="text-lg text-ritual-accent">{formatEther(stats.totalVolume)} RIT</span>
          </div>
          <div className="terminal-border p-2 flex flex-col items-end">
            <span className="text-[10px] text-ritual-muted uppercase">WIN_RATE</span>
            <span className="text-lg text-ritual-accent">
              {stats.winRate}
              {stats.winRate !== "—" ? "%" : ""}
            </span>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="terminal-border bg-ritual-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-ritual-border bg-ritual-bg/50">
                <th className="px-4 py-3 text-[10px] text-ritual-muted uppercase">ID</th>
                <th className="px-4 py-3 text-[10px] text-ritual-muted uppercase">MARKET</th>
                <th className="px-4 py-3 text-[10px] text-ritual-muted uppercase">SELECTION</th>
                <th className="px-4 py-3 text-[10px] text-ritual-muted uppercase">AMOUNT</th>
                <th className="px-4 py-3 text-[10px] text-ritual-muted uppercase">OUTCOME</th>
                <th className="px-4 py-3 text-[10px] text-ritual-muted uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ritual-border/30">
              {marketIds.map((id) => (
                <MyBetRow key={id.toString()} marketId={id} onEntries={onEntries} />
              ))}
            </tbody>
          </table>
        </div>
        {count === undefined ? (
          <div className="text-ritual-muted text-sm text-center py-8">LOADING_POSITIONS...</div>
        ) : allEntries.length === 0 ? (
          <div className="text-ritual-muted text-sm text-center py-8">NO_POSITIONS_YET.</div>
        ) : (
          <div className="flex justify-between items-center px-4 py-3 border-t border-ritual-border text-[10px] text-ritual-muted">
            <div>SHOWING {stats.total} POSITION{stats.total === 1 ? "" : "S"}</div>
          </div>
        )}
      </section>

      {/* Network status bento */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="terminal-border p-6 bg-ritual-panel">
          <h3 className="text-[10px] text-ritual-muted mb-4 uppercase">TEE_VERIFICATION_STATUS</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="opacity-60">PRECOMPILE:</span>
              <span className="text-ritual-accent">{HTTP_PRECOMPILE}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">CHAIN_ID:</span>
              <span className="text-ritual-accent">1979</span>
            </div>
          </div>
        </div>
        <div className="terminal-border p-6 bg-ritual-panel">
          <h3 className="text-[10px] text-ritual-muted mb-4 uppercase">ACTIVE_RITUALS</h3>
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-1 bg-ritual-border relative">
              <div
                className="absolute top-0 left-0 h-full bg-ritual-accent"
                style={{ width: stats.total > 0 ? `${((stats.total - stats.active) / stats.total) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-ritual-accent">{stats.total - stats.active}/{stats.total}</span>
          </div>
          <p className="text-[10px] text-ritual-muted mt-4 opacity-50 uppercase">
            DATA_ORACLE_FEED: OPEN_WEATHER_MAP
          </p>
        </div>
      </section>
    </div>
  );
}
