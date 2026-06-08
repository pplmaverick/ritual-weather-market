"use client";

import {
  useReadContract,
  useWriteContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { encodeFunctionData, parseEther, formatEther } from "viem";
import { useState, useCallback } from "react";
import { WEATHER_MARKET_ABI, RITUAL_WALLET_ABI } from "@/lib/abi";
import { MARKET_ADDRESS, RITUAL_WALLET } from "@/lib/addresses";

// ─── Display helpers ──────────────────────────────────────────────────────────

/** Convert contract fixed-point (int256 × 100) to "25.40°C" display string */
export function formatTemp(raw: bigint): string {
  const ZERO = BigInt(0);
  const HUNDRED = BigInt(100);
  const abs = raw < ZERO ? -raw : raw;
  const int  = abs / HUNDRED;
  const frac = (abs % HUNDRED).toString().padStart(2, "0");
  return `${raw < ZERO ? "-" : ""}${int}.${frac}°C`;
}

/** Convert user input string (e.g. "25.4") to contract fixed-point bigint (2540n) */
export function parseTargetTemp(input: string): bigint {
  const f = parseFloat(input);
  if (isNaN(f)) throw new Error("Invalid temperature");
  return BigInt(Math.round(f * 100));
}

// ─── Market count ─────────────────────────────────────────────────────────────

export function useMarketCount() {
  return useReadContract({
    address: MARKET_ADDRESS,
    abi: WEATHER_MARKET_ABI,
    functionName: "marketCount",
  });
}

// ─── Single market ────────────────────────────────────────────────────────────

export function useMarket(marketId: bigint) {
  return useReadContract({
    address: MARKET_ADDRESS,
    abi: WEATHER_MARKET_ABI,
    functionName: "getMarket",
    args: [marketId],
  });
}

// ─── User bets on a market ────────────────────────────────────────────────────

export function useUserBets(marketId: bigint) {
  const { address } = useAccount();
  return useReadContract({
    address: MARKET_ADDRESS,
    abi: WEATHER_MARKET_ABI,
    functionName: "getUserBets",
    args: [marketId, address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address },
  });
}

// ─── Create market ────────────────────────────────────────────────────────────

export function useCreateMarket() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const create = useCallback(
    async (
      city: string,
      targetTempInput: string,
      bettingDeadline: number,
      resolutionTime: number,
    ) => {
      const targetTemp = parseTargetTemp(targetTempInput);
      const h = await writeContractAsync({
        address: MARKET_ADDRESS,
        abi: WEATHER_MARKET_ABI,
        functionName: "createMarket",
        args: [city, targetTemp, BigInt(bettingDeadline), BigInt(resolutionTime)],
      });
      setHash(h);
      return h;
    },
    [writeContractAsync],
  );

  return { create, hash, isPending, isConfirming, isSuccess };
}

// ─── Place bet ────────────────────────────────────────────────────────────────

export function usePlaceBet(marketId: bigint) {
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const bet = useCallback(
    async (isAbove: boolean, amountEth: string) => {
      const h = await writeContractAsync({
        address: MARKET_ADDRESS,
        abi: WEATHER_MARKET_ABI,
        functionName: "placeBet",
        args: [marketId, isAbove],
        value: parseEther(amountEth),
      });
      setHash(h);
      return h;
    },
    [writeContractAsync, marketId],
  );

  return { bet, hash, isPending, isConfirming, isSuccess };
}

// ─── Resolve market ───────────────────────────────────────────────────────────
//
// IMPORTANT: resolveMarket calls the HTTP precompile (0x0801) internally.
// writeContractAsync uses simulateContract → eth_call → "call to non-contract".
// Use sendTransactionAsync + encodeFunctionData to bypass simulation.

export type ResolveStatus =
  | "idle"
  | "confirming"   // wallet popup open
  | "submitted"    // tx hash received, waiting for initial confirmation
  | "settling"     // tx confirmed; TEE executor fetching weather; waiting for fulfilled replay
  | "resolved"     // market.resolved flipped to true
  | "error";

export function useResolveMarket(marketId: bigint, isResolved: boolean) {
  const { sendTransactionAsync } = useSendTransaction();
  const [status, setStatus] = useState<ResolveStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<string | undefined>();

  // Watch for the fulfilled-replay settlement
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const resolve = useCallback(async () => {
    setError(undefined);
    setStatus("confirming");
    try {
      const data = encodeFunctionData({
        abi: WEATHER_MARKET_ABI,
        functionName: "resolveMarket",
        args: [marketId],
      });
      const hash = await sendTransactionAsync({
        to: MARKET_ADDRESS,
        data,
        gas: BigInt(2_000_000),
        maxFeePerGas: BigInt(30_000_000_000),
        maxPriorityFeePerGas: BigInt(2_000_000_000),
      });
      setTxHash(hash);
      setStatus("submitted");
    } catch (e) {
      setError((e as Error).message);
      setStatus("error");
    }
  }, [sendTransactionAsync, marketId]);

  // After initial TX confirms → move to "settling" while executor does its job
  if (txConfirmed && status === "submitted") {
    setStatus("settling");
  }

  // Once the market is resolved on-chain (polled by parent) → done
  if (isResolved && status === "settling") {
    setStatus("resolved");
  }

  return { resolve, status, txHash, error };
}

// ─── Claim payout ─────────────────────────────────────────────────────────────

// IMPORTANT: writeContractAsync calls simulateContract (eth_call) first.
// On Ritual Chain, eth_call reverts when the contract sends ETH back to msg.sender
// (the call{value: payout}("") pattern), even though the real tx succeeds.
// Use sendTransactionAsync + encodeFunctionData to bypass simulation entirely.
export function useClaim(marketId: bigint) {
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const claim = useCallback(async () => {
    const data = encodeFunctionData({
      abi: WEATHER_MARKET_ABI,
      functionName: "claim",
      args: [marketId],
    });
    const h = await sendTransactionAsync({
      to: MARKET_ADDRESS,
      data,
      gas: BigInt(200_000),
    });
    setHash(h);
    return h;
  }, [sendTransactionAsync, marketId]);

  return { claim, hash, isPending, isConfirming, isSuccess };
}

// ─── Computed market state helper ─────────────────────────────────────────────

export interface MarketState {
  city: string;
  targetTemp: bigint;
  bettingDeadline: bigint;
  resolutionTime: bigint;
  totalAbove: bigint;
  totalBelow: bigint;
  resolved: boolean;
  resultIsAbove: boolean;
  actualTemp: bigint;
  totalPot: bigint;
  status: "open" | "closed" | "resolvable" | "resolved";
}

export function computeMarketState(
  data: readonly [string, bigint, bigint, bigint, bigint, bigint, boolean, boolean, bigint] | undefined,
): MarketState | undefined {
  if (!data) return undefined;
  const [city, targetTemp, bettingDeadline, resolutionTime, totalAbove, totalBelow, resolved, resultIsAbove, actualTemp] = data;
  // Ritual Chain block.timestamp is in milliseconds
  const now = BigInt(Date.now());

  let status: MarketState["status"];
  if (resolved) {
    status = "resolved";
  } else if (now >= resolutionTime) {
    status = "resolvable";
  } else if (now >= bettingDeadline) {
    status = "closed";
  } else {
    status = "open";
  }

  return {
    city, targetTemp, bettingDeadline, resolutionTime,
    totalAbove, totalBelow, resolved, resultIsAbove, actualTemp,
    totalPot: totalAbove + totalBelow,
    status,
  };
}

export { formatEther };

// ─── RitualWallet balance & deposit ──────────────────────────────────────────
// resolveMarket calls the HTTP precompile; Ritual deducts the fee from the
// *transaction sender's* (tx.origin) RitualWallet balance, NOT the contract's.
// Minimum safe deposit: 0.005 RITUAL covers ~5 resolve calls.
export const RITUAL_WALLET_MIN = parseEther("0.005");

export function useRitualWalletBalance() {
  const { address } = useAccount();
  return useReadContract({
    address: RITUAL_WALLET,
    abi: RITUAL_WALLET_ABI,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

export function useDepositToRitualWallet() {
  const { writeContractAsync, isPending } = useWriteContract();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  const deposit = useCallback(async () => {
    const h = await writeContractAsync({
      address: RITUAL_WALLET,
      abi: RITUAL_WALLET_ABI,
      functionName: "deposit",
      args: [BigInt(100_000)],
      value: parseEther("0.01"),
    });
    setHash(h);
    return h;
  }, [writeContractAsync]);

  return { deposit, hash, isPending, isConfirming, isSuccess };
}
