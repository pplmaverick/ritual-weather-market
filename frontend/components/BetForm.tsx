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
    <div className="space-y-3">
      {/* Show existing bets */}
      {userBets && (userBets[0] > BigInt(0) || userBets[1] > BigInt(0)) && (
        <div className="text-xs text-ritual-muted border border-ritual-border rounded p-2">
          Your bets: &nbsp;
          {userBets[0] > BigInt(0) && (
            <span className="text-green-400">Above: {formatEther(userBets[0])} RITUAL </span>
          )}
          {userBets[1] > BigInt(0) && (
            <span className="text-red-400">Below: {formatEther(userBets[1])} RITUAL</span>
          )}
          {userBets[2] && <span className="text-ritual-orange ml-2">Claimed</span>}
        </div>
      )}

      {isSuccess ? (
        <p className="text-green-400 text-xs">Bet placed successfully!</p>
      ) : (
        <form onSubmit={handleBet} className="space-y-3">
          {/* Side selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide("above")}
              className={`py-2 px-3 text-xs font-bold rounded border transition-colors ${
                side === "above"
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : "border-ritual-border text-ritual-muted hover:border-green-500/50"
              }`}
            >
              &#9650; ABOVE {formatTemp(targetTemp)}
            </button>
            <button
              type="button"
              onClick={() => setSide("below")}
              className={`py-2 px-3 text-xs font-bold rounded border transition-colors ${
                side === "below"
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : "border-ritual-border text-ritual-muted hover:border-red-500/50"
              }`}
            >
              &#9660; BELOW {formatTemp(targetTemp)}
            </button>
          </div>

          {/* Amount */}
          <div className="flex gap-2">
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 bg-ritual-bg border border-ritual-border rounded px-3 py-2
                         text-sm text-white focus:border-ritual-orange focus:outline-none"
              placeholder="0.01"
            />
            <span className="self-center text-xs text-ritual-muted">RITUAL</span>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-2 py-1">
              {error.slice(0, 120)}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || isConfirming}
            className={`w-full py-2 text-sm font-bold rounded transition-colors disabled:opacity-50 ${
              side === "above"
                ? "bg-green-500/10 border border-green-500 text-green-400 hover:bg-green-500/20"
                : "bg-red-500/10 border border-red-500 text-red-400 hover:bg-red-500/20"
            }`}
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Placing bet..." : "Place Bet"}
          </button>
        </form>
      )}
    </div>
  );
}
