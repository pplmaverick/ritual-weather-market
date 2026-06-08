"use client";

import dynamic from "next/dynamic";
import { useMarketCount } from "@/hooks/useWeatherMarket";
import { MARKET_ADDRESS } from "@/lib/addresses";

const ChainGuard   = dynamic(() => import("@/components/ChainGuard").then((m) => m.ChainGuard), { ssr: false });
const CreateMarket = dynamic(() => import("@/components/CreateMarket").then((m) => m.CreateMarket), { ssr: false });
const MarketCard   = dynamic(() => import("@/components/MarketCard").then((m) => m.MarketCard), { ssr: false });

export default function Home() {
  return (
    <ChainGuard>
      <MarketList />
    </ChainGuard>
  );
}

function MarketList() {
  const { data: count, refetch: refetchCount } = useMarketCount();

  const isContractMissing =
    MARKET_ADDRESS === "0x0000000000000000000000000000000000000000";

  if (isContractMissing) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <p className="text-ritual-orange font-bold text-lg">Contract not deployed yet</p>
        <div className="text-xs text-ritual-muted border border-ritual-border rounded-lg p-4 text-left space-y-2">
          <p className="font-bold text-white">Setup steps:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Get testnet RITUAL from the faucet (link below)</li>
            <li>Copy <code className="text-ritual-orange">contracts/.env.example</code> to <code className="text-ritual-orange">contracts/.env</code> and fill in your keys</li>
            <li>Run: <code className="text-ritual-orange block mt-1 ml-4">cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url $RITUAL_RPC_URL --broadcast -vvvv</code></li>
            <li>Copy the contract address to <code className="text-ritual-orange">frontend/.env.local</code></li>
            <li>Restart: <code className="text-ritual-orange">npm run dev</code></li>
          </ol>
          <a
            href="https://faucet.ritualfoundation.org"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-ritual-orange underline"
          >
            → Get testnet RITUAL
          </a>
        </div>
      </div>
    );
  }

  const marketIds = count !== undefined
    ? Array.from({ length: Number(count) }, (_, i) => BigInt(i))
    : [];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="border border-ritual-border rounded-lg p-6 bg-ritual-surface">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-ritual-orange">&#9681;</span>
          <span className="text-xs text-ritual-muted uppercase tracking-widest">Ritual HTTP Precompile (0x0801)</span>
        </div>
        <h1 className="text-xl font-bold text-white">On-Chain Weather Markets</h1>
        <p className="text-sm text-ritual-muted mt-2 max-w-xl">
          Bet on real-time city temperatures. Markets resolve by calling the OpenWeather API
          directly from Solidity — no oracle, no off-chain bot. A TEE executor fetches the data
          and the result is settled on Ritual Chain.
        </p>
        <div className="flex gap-4 mt-4 text-xs text-ritual-muted">
          <span>&#8192;Chain ID: 1979</span>
          <span>&#8192;No oracle needed</span>
          <span>&#8192;TEE-verified HTTP</span>
        </div>
      </div>

      {/* Create */}
      <CreateMarket onCreated={refetchCount} />

      {/* Markets */}
      {count === undefined ? (
        <div className="text-ritual-muted text-sm text-center py-8">Loading markets...</div>
      ) : count === BigInt(0) ? (
        <div className="text-ritual-muted text-sm text-center py-8">
          No markets yet. Create the first one above.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {marketIds.reverse().map((id) => (
            <MarketCard key={id.toString()} marketId={id} />
          ))}
        </div>
      )}
    </div>
  );
}
