"use client";

import { useState } from "react";
import { usePlaceBet, useUserBets, formatTemp, formatEther } from "@/hooks/useWeatherMarket";

interface Props {
  marketId: bigint;
  targetTemp: bigint;
  onBet?: () => void;
}

export function BetForm({ marketId, targetTemp, onBet }: Props) {
  const [side, setSide] = useState<"above" | "below">("above");
  const [amount, setAmount] = useState("0.01");
  const [error, setError] = useState<string | undefined>();

  const { bet, isPending, isConfirming, isSuccess } = usePlaceBet(marketId);
  const { data: userBets, refetch } = useUserBets(marketId);

  const handleBet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    try {
      await bet(side === "above", amount);
      refetch();
      onBet?.();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Show existing bets */}
      {userBets && (userBets[0] > BigInt(0) || userBets[1] > BigInt(0)) && (
        <div className="text-xs text-ritual-muted terminal-border px-3 py-2">
          YOUR_POSITION: &nbsp;
          {userBets[0] > BigInt(0) && (
            <span className="text-ritual-accent">ABOVE: {formatEther(userBets[0])} RITUAL &nbsp;</span>
          )}
          {userBets[1] > BigInt(0) && (
            <span className="text-ritual-red">BELOW: {formatEther(userBets[1])} RITUAL</span>
          )}
          {userBets[2] && <span className="text-ritual-purple ml-2">CLAIMED</span>}
        </div>
      )}

      {isSuccess ? (
        <p className="text-ritual-accent text-xs">BET_PLACED_SUCCESSFULLY</p>
      ) : (
        <form onSubmit={handleBet} className="space-y-6">
          {/* Amount */}
          <div>
            <label className="text-[10px] text-ritual-muted block mb-2 tracking-widest">
              STAKE_AMOUNT (RITUAL)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-ritual-border text-2xl
                           text-ritual-accent focus:ring-0 focus:border-ritual-accent placeholder:text-ritual-muted
                           p-0 pb-2 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSide("above")}
              className={`terminal-border py-4 px-6 flex flex-col items-center gap-1 transition-all ${
                side === "above" ? "border-ritual-accent bg-ritual-accent/10" : "hover:bg-ritual-accent/5"
              }`}
            >
              <span className="text-ritual-accent text-lg" aria-hidden>▲</span>
              <span className="text-[11px] text-ritual-muted tracking-widest">
                ABOVE {formatTemp(targetTemp)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSide("below")}
              className={`terminal-border py-4 px-6 flex flex-col items-center gap-1 transition-all ${
                side === "below" ? "border-ritual-red bg-ritual-red/10" : "hover:bg-ritual-red/5"
              }`}
            >
              <span className="text-ritual-red text-lg" aria-hidden>▼</span>
              <span className="text-[11px] text-ritual-muted tracking-widest">
                BELOW {formatTemp(targetTemp)}
              </span>
            </button>
          </div>

          {error && (
            <p className="text-ritual-red text-xs border border-ritual-red/30 bg-ritual-red/10 px-3 py-2">
              {error.slice(0, 120)}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className={`terminal-border-strong w-full py-5 text-sm font-bold uppercase tracking-widest
                       transition-all active:scale-[0.98] disabled:opacity-50 ${
              side === "above"
                ? "text-ritual-accent bg-ritual-accent/5 hover:bg-ritual-accent/20"
                : "text-ritual-red border-ritual-red bg-ritual-red/5 hover:bg-ritual-red/20"
            }`}
          >
            {isPending ? "CONFIRM_IN_WALLET..." : isConfirming ? "PLACING_BET..." : "[EXECUTE_BET]"}
          </button>
        </form>
      )}
    </div>
  );
}
