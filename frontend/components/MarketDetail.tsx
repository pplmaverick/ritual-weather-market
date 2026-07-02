"use client";

import Link from "next/link";
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
  formatCityLabel,
  RITUAL_WALLET_MIN,
} from "@/hooks/useWeatherMarket";
import { useCountdown } from "@/hooks/useCountdown";
import { BetForm } from "./BetForm";

interface Props {
  marketId: bigint;
}

const STATUS_LABEL = {
  open: "OPEN",
  closed: "AWAITING_RESOLUTION_WINDOW",
  resolvable: "READY_TO_RESOLVE",
  resolved: "RESOLVED_ON_CHAIN",
};

export function MarketDetail({ marketId }: Props) {
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

  const countdownTarget = state
    ? state.status === "open"
      ? state.bettingDeadline
      : state.status === "closed" || state.status === "resolvable"
      ? state.resolutionTime
      : undefined
    : undefined;
  const countdown = useCountdown(countdownTarget);

  if (!state) {
    return <div className="terminal-border bg-ritual-panel h-96 animate-pulse" />;
  }

  const canClaim = state.resolved &&
    userBets &&
    (userBets[0] > BigInt(0) || userBets[1] > BigInt(0)) &&
    !userBets[2];

  const abovePct = state.totalPot > BigInt(0)
    ? Number((state.totalAbove * BigInt(100)) / state.totalPot)
    : 50;

  return (
    <div>
      <Link href="/" className="text-ritual-muted text-xs hover:text-ritual-accent transition-colors inline-flex items-center gap-1 mb-6">
        [&lt;&lt; RETURN]
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-ritual-accent">{formatCityLabel(state.city)}</h1>
          <div className="flex items-center gap-3 text-ritual-muted text-xs mt-1">
            <span className={`w-2 h-2 rounded-full ${state.status === "open" ? "bg-ritual-accent animate-pulse" : "bg-ritual-muted"}`} />
            MARKET #{marketId.toString()} // {STATUS_LABEL[state.status]}
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="text-[10px] text-ritual-muted uppercase tracking-widest mb-1">SETTLEMENT_TARGET</div>
          <div className="text-xl">&gt; {formatTemp(state.targetTemp)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left column */}
        <div className="lg:col-span-7 space-y-4">
          {/* Pool composition visualization */}
          <div className="terminal-border crt-glow bg-ritual-panel p-6">
            <div className="flex justify-between mb-6">
              <span className="text-[11px] text-ritual-accent bg-ritual-accent/10 px-2 py-0.5">
                POOL_COMPOSITION
              </span>
              {state.resolved && (
                <span className="text-xs text-ritual-muted">
                  RESOLVED: {state.resultIsAbove ? "ABOVE_WIN" : "BELOW_WIN"}
                </span>
              )}
            </div>
            <div className="h-3 bg-ritual-bg terminal-border overflow-hidden flex">
              <div className="bg-ritual-accent transition-all duration-500" style={{ width: `${abovePct}%` }} />
              <div className="flex-1 bg-ritual-red" />
            </div>
            <div className="flex justify-between text-xs mt-3">
              <span className="text-ritual-accent">ABOVE: {formatEther(state.totalAbove)} RITUAL ({abovePct}%)</span>
              <span className="text-ritual-red">BELOW: {formatEther(state.totalBelow)} RITUAL ({100 - abovePct}%)</span>
            </div>
            {state.resolved && (
              <div className="mt-6 pt-4 border-t border-ritual-border text-xs">
                FINAL_TEMP:&nbsp;
                <span className={state.resultIsAbove ? "text-ritual-accent" : "text-ritual-red"}>
                  {formatTemp(state.actualTemp)}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="terminal-border p-4 bg-ritual-panel">
              <div className="text-[10px] text-ritual-muted mb-2 tracking-widest">TOTAL_POT</div>
              <div className="text-lg text-ritual-accent">{formatEther(state.totalPot)}</div>
            </div>
            <div className="terminal-border p-4 bg-ritual-panel">
              <div className="text-[10px] text-ritual-muted mb-2 tracking-widest">BETTING_CLOSES</div>
              <div className="text-xs text-ritual-text pt-1">
                {new Date(Number(state.bettingDeadline)).toLocaleString()}
              </div>
            </div>
            <div className="terminal-border p-4 bg-ritual-panel">
              <div className="text-[10px] text-ritual-muted mb-2 tracking-widest">ORACLE</div>
              <div className="text-lg text-ritual-accent">TEE_HTTP</div>
            </div>
          </div>
        </div>

        {/* Right column: Execution Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="terminal-border bg-ritual-panel p-6 md:p-8">
            <h3 className="text-[10px] text-ritual-muted mb-8 uppercase tracking-widest">
              EXECUTION_PANEL_V1.0
            </h3>

            {!isConnected ? (
              <p className="text-xs text-ritual-muted">CONNECT_WALLET_TO_INTERACT</p>
            ) : state.status === "open" ? (
              <BetForm
                marketId={marketId}
                targetTemp={state.targetTemp}
                onBet={() => { refetch(); refetchBets(); }}
              />
            ) : state.status === "closed" ? (
              <div className="text-xs text-ritual-yellow border border-dashed border-ritual-yellow/40 p-4 text-center">
                BETTING_CLOSED — MARKET_RESOLVES_AT {countdown}
              </div>
            ) : state.status === "resolvable" ? (
              <div className="space-y-3">
                {!hasEnoughBalance ? (
                  <>
                    <div className="text-xs text-ritual-yellow terminal-border p-3">
                      <p className="font-bold mb-1">RITUAL_WALLET_TOPUP_REQUIRED</p>
                      <p className="text-ritual-muted">
                        Resolving calls the HTTP precompile. Ritual deducts a fee (~0.000005 RITUAL)
                        from your personal RitualWallet balance.
                      </p>
                      <p className="mt-1">
                        BALANCE:{" "}
                        <span className="text-ritual-text">
                          {ritualWalletBalance !== undefined ? `${formatEther(ritualWalletBalance)} RITUAL` : "loading..."}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => depositToRitual().then(() => refetchBalance())}
                      disabled={depositPending || depositConfirming}
                      className="w-full py-3 text-sm font-bold border border-ritual-yellow text-ritual-yellow
                                 bg-ritual-yellow/10 hover:bg-ritual-yellow/20 transition-colors disabled:opacity-50 uppercase tracking-widest"
                    >
                      {depositPending
                        ? "CONFIRM_IN_WALLET..."
                        : depositConfirming
                        ? "DEPOSITING_0.01_RITUAL..."
                        : depositSuccess
                        ? "DEPOSITED — REFRESHING..."
                        : "[DEPOSIT_0.01_RITUAL]"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={resolve}
                    disabled={resolveStatus === "confirming" || resolveStatus === "submitted" || resolveStatus === "settling"}
                    className="terminal-border-strong w-full py-5 text-sm font-bold text-ritual-accent
                               bg-ritual-accent/5 hover:bg-ritual-accent/20 transition-all disabled:opacity-50 uppercase tracking-widest"
                  >
                    {resolveStatus === "idle" || resolveStatus === "error"
                      ? "[RESOLVE_VIA_OPENWEATHER]"
                      : resolveStatus === "confirming"
                      ? "CONFIRM_IN_WALLET..."
                      : resolveStatus === "submitted"
                      ? "AWAITING_TX_CONFIRMATION..."
                      : "TEE_FETCHING_WEATHER_DATA..."}
                  </button>
                )}

                {resolveStatus === "settling" && (
                  <div className="text-xs text-ritual-accent/80 terminal-border p-3">
                    <p className="font-bold mb-1">HTTP_PRECOMPILE_IN_PROGRESS</p>
                    <p className="text-ritual-muted">
                      TEE executor is calling OpenWeather API. The fulfilled-replay TX will settle the market
                      on-chain automatically. This takes ~5-30 seconds.
                    </p>
                    {resolveTx && (
                      <a
                        href={`https://explorer.ritualfoundation.org/tx/${resolveTx}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-ritual-accent mt-1 block truncate"
                      >
                        VIEW_TX: {resolveTx.slice(0, 20)}...
                      </a>
                    )}
                  </div>
                )}

                {resolveStatus === "error" && resolveError && (
                  <p className="text-ritual-red text-xs border border-ritual-red/30 bg-ritual-red/10 px-3 py-2">
                    {resolveError.slice(0, 200)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs terminal-border p-3">
                  RESULT:&nbsp;
                  <span className={state.resultIsAbove ? "text-ritual-accent font-bold" : "text-ritual-red font-bold"}>
                    {formatTemp(state.actualTemp)} — {state.resultIsAbove ? "ABOVE" : "BELOW"}
                  </span>
                  &nbsp;target
                </div>
                {canClaim && (
                  <button
                    onClick={() => claim().then(() => { refetch(); refetchBets(); })}
                    disabled={claimPending || claimConfirming || claimSuccess}
                    className="terminal-border-strong w-full py-4 text-sm font-bold text-ritual-purple
                               bg-ritual-purple/10 hover:bg-ritual-purple/20 transition-all disabled:opacity-50 uppercase tracking-widest"
                  >
                    {claimPending ? "CONFIRM_IN_WALLET..." : claimConfirming ? "CLAIMING..." : claimSuccess ? "CLAIMED!" : "[CLAIM_PAYOUT]"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TEE monitoring box */}
          <div className="terminal-border bg-ritual-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-ritual-accent" aria-hidden>▣</span>
                <span className="text-[11px] text-ritual-accent tracking-widest">TEE_MONITORING</span>
              </div>
              <div className="text-xs text-ritual-muted uppercase">
                {state.resolved ? "SETTLED_ON_CHAIN" : "RECORDING_ON_CHAIN"}
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-[10px] text-ritual-muted tracking-widest">
                {state.status === "open" ? "BETTING_CLOSES_IN" : state.resolved ? "SETTLED" : "RESOLVES_IN"}
              </div>
              <div className="text-2xl tracking-widest text-ritual-accent">
                {state.resolved ? "[00:00:00]" : countdown}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-ritual-border flex gap-4 text-[11px]">
              <div className="flex-1">
                <div className="text-[9px] text-ritual-muted mb-1 tracking-widest">RESOLUTION</div>
                <div className="truncate">
                  {new Date(Number(state.resolutionTime)).toLocaleString()}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-ritual-muted mb-1 tracking-widest">PROOFS</div>
                <div>{state.resolved ? "VERIFIED" : "PENDING"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
