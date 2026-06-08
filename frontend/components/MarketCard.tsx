"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  useMarket,
  useResolveMarket,
  useClaim,
  useUserBets,
  useRitualWalletBalance,
  useDepositToRitualWallet,
  computeMarketState,
  formatTemp,
  formatEther,
  RITUAL_WALLET_MIN,
} from "@/hooks/useWeatherMarket";
import { BetForm } from "./BetForm";

interface Props {
  marketId: bigint;
}

export function MarketCard({ marketId }: Props) {
  const { isConnected } = useAccount();
  const { data, refetch } = useMarket(marketId);
  const state = computeMarketState(data);
  const { data: userBets, refetch: refetchBets } = useUserBets(marketId);

  const { resolve, status: resolveStatus, txHash: resolveTx, error: resolveError } =
    useResolveMarket(marketId, state?.resolved ?? false);

  const { claim, isPending: claimPending, isConfirming: claimConfirming, isSuccess: claimSuccess } =
    useClaim(marketId);

  const { data: ritualWalletBalance, refetch: refetchBalance } = useRitualWalletBalance();
  const { deposit: depositToRitual, isPending: depositPending, isConfirming: depositConfirming, isSuccess: depositSuccess } =
    useDepositToRitualWallet();

  const hasEnoughBalance = ritualWalletBalance !== undefined && ritualWalletBalance >= RITUAL_WALLET_MIN;

  const [showBet, setShowBet] = useState(false);

  if (!state) {
    return (
      <div className="border border-ritual-border rounded-lg p-5 animate-pulse bg-ritual-surface">
        <div className="h-4 bg-ritual-border rounded w-1/2 mb-3" />
        <div className="h-3 bg-ritual-border rounded w-1/3" />
      </div>
    );
  }

  const statusColor = {
    open:       "text-green-400 border-green-500/40",
    closed:     "text-yellow-400 border-yellow-500/40",
    resolvable: "text-blue-400 border-blue-500/40",
    resolved:   "text-ritual-muted border-ritual-border",
  }[state.status];

  const statusLabel = {
    open:       "OPEN",
    closed:     "CLOSED — AWAITING RESOLUTION",
    resolvable: "READY TO RESOLVE",
    resolved:   `RESOLVED`,
  }[state.status];

  const abovePct = state.totalPot > BigInt(0)
    ? Number((state.totalAbove * BigInt(100)) / state.totalPot)
    : 50;

  const canClaim = state.resolved &&
    userBets &&
    (userBets[0] > BigInt(0) || userBets[1] > BigInt(0)) &&
    !userBets[2];

  return (
    <div className="border border-ritual-border bg-ritual-surface rounded-lg p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-white text-base">
            {state.city}
          </h3>
          <p className="text-ritual-muted text-xs mt-0.5">Market #{marketId.toString()}</p>
        </div>
        <span className={`text-xs border rounded px-2 py-0.5 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Target + result */}
      <div className="bg-ritual-bg border border-ritual-border rounded p-3 space-y-1">
        <p className="text-xs text-ritual-muted">
          Will temperature be above or below&nbsp;
          <span className="text-white font-bold">{formatTemp(state.targetTemp)}</span>?
        </p>
        {state.resolved && (
          <p className="text-xs">
            Resolved:&nbsp;
            <span className={state.resultIsAbove ? "text-green-400" : "text-red-400"}>
              {formatTemp(state.actualTemp)} — {state.resultIsAbove ? "ABOVE" : "BELOW"}
            </span>
            &nbsp;target
          </p>
        )}
      </div>

      {/* Deadline info */}
      <div className="grid grid-cols-2 gap-2 text-xs text-ritual-muted">
        <div>
          <span className="block text-white">Betting closes</span>
          {new Date(Number(state.bettingDeadline)).toLocaleString()}
        </div>
        <div>
          <span className="block text-white">Resolves after</span>
          {new Date(Number(state.resolutionTime)).toLocaleString()}
        </div>
      </div>

      {/* Pool bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-green-400">Above: {formatEther(state.totalAbove)} RITUAL</span>
          <span className="text-red-400">Below: {formatEther(state.totalBelow)} RITUAL</span>
        </div>
        <div className="h-2 bg-ritual-bg rounded-full overflow-hidden flex">
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${abovePct}%` }}
          />
          <div className="flex-1 bg-red-500" />
        </div>
        <p className="text-xs text-ritual-muted text-center">
          Total pot: {formatEther(state.totalPot)} RITUAL
        </p>
      </div>

      {/* Actions */}
      {isConnected && (
        <div className="space-y-2">
          {/* Bet form (only when open) */}
          {state.status === "open" && (
            <div>
              <button
                onClick={() => setShowBet((v) => !v)}
                className="text-xs text-ritual-orange underline"
              >
                {showBet ? "Hide bet form" : "Place a bet"}
              </button>
              {showBet && (
                <div className="mt-2">
                  <BetForm
                    marketId={marketId}
                    targetTemp={state.targetTemp}
                    onBet={() => { refetch(); refetchBets(); }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Resolve button */}
          {state.status === "resolvable" && (
            <div className="space-y-2">
              {!hasEnoughBalance ? (
                <div className="space-y-2">
                  <div className="text-xs text-yellow-400/80 bg-yellow-500/5 border border-yellow-500/20 rounded p-2">
                    <p className="font-bold mb-1">RitualWallet top-up required</p>
                    <p>
                      Resolving calls the HTTP precompile. Ritual deducts a fee (~0.000005 RITUAL)
                      from your personal RitualWallet balance.
                    </p>
                    <p className="mt-1">
                      Current balance:{" "}
                      <span className="text-white">
                        {ritualWalletBalance !== undefined
                          ? `${formatEther(ritualWalletBalance)} RITUAL`
                          : "loading..."}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => depositToRitual().then(() => refetchBalance())}
                    disabled={depositPending || depositConfirming}
                    className="w-full py-2 text-sm font-bold border border-yellow-500 text-yellow-400
                               bg-yellow-500/10 hover:bg-yellow-500/20 rounded transition-colors disabled:opacity-50"
                  >
                    {depositPending
                      ? "Confirm in wallet..."
                      : depositConfirming
                      ? "Depositing 0.01 RITUAL..."
                      : depositSuccess
                      ? "Deposited — refreshing..."
                      : "Deposit 0.01 RITUAL to RitualWallet"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={resolve}
                  disabled={resolveStatus === "confirming" || resolveStatus === "submitted" || resolveStatus === "settling"}
                  className="w-full py-2 text-sm font-bold border border-blue-500 text-blue-400
                             bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50"
                >
                  {resolveStatus === "idle" || resolveStatus === "error"
                    ? "Resolve Market via OpenWeather"
                    : resolveStatus === "confirming"
                    ? "Confirm in wallet..."
                    : resolveStatus === "submitted"
                    ? "Awaiting TX confirmation..."
                    : "TEE fetching weather data..."}
                </button>
              )}

              {resolveStatus === "settling" && (
                <div className="text-xs text-blue-400/70 bg-blue-500/5 border border-blue-500/20 rounded p-2">
                  <p className="font-bold mb-1">HTTP Precompile in progress</p>
                  <p>TEE executor is calling OpenWeather API. The fulfilled-replay TX will settle the market on-chain automatically. This takes ~5–30 seconds.</p>
                  {resolveTx && (
                    <a
                      href={`https://explorer.ritualfoundation.org/tx/${resolveTx}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-300 mt-1 block truncate"
                    >
                      View TX: {resolveTx.slice(0, 20)}...
                    </a>
                  )}
                </div>
              )}

              {resolveStatus === "error" && resolveError && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-2 py-1">
                  {resolveError.slice(0, 200)}
                </p>
              )}
            </div>
          )}

          {/* Claim button */}
          {canClaim && (
            <button
              onClick={() => claim().then(() => { refetch(); refetchBets(); })}
              disabled={claimPending || claimConfirming || claimSuccess}
              className="w-full py-2 text-sm font-bold border border-ritual-orange text-ritual-orange
                         bg-ritual-orange/10 hover:bg-ritual-orange/20 rounded transition-colors disabled:opacity-50"
            >
              {claimPending ? "Confirm in wallet..." : claimConfirming ? "Claiming..." : claimSuccess ? "Claimed!" : "Claim Winnings"}
            </button>
          )}
        </div>
      )}

      {!isConnected && (
        <p className="text-xs text-ritual-muted">Connect wallet to bet or resolve</p>
      )}
    </div>
  );
}
