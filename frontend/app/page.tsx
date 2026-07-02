"use client";

import dynamic from "next/dynamic";
import { useMarketCount } from "@/hooks/useWeatherMarket";
import { MARKET_ADDRESS } from "@/lib/addresses";
import { TeeVerificationLog } from "@/components/TeeVerificationLog";

const ChainGuard   = dynamic(() => import("@/components/ChainGuard").then((m) => m.ChainGuard), { ssr: false });
const CreateMarket = dynamic(() => import("@/components/CreateMarket").then((m) => m.CreateMarket), { ssr: false });
const MarketGridCard = dynamic(() => import("@/components/MarketGridCard").then((m) => m.MarketGridCard), { ssr: false });

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
        <p className="text-ritual-yellow font-bold text-lg">CONTRACT_NOT_DEPLOYED</p>
        <div className="text-xs text-ritual-muted terminal-border p-4 text-left space-y-2">
          <p className="font-bold text-ritual-text">SETUP_STEPS:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Get testnet RITUAL from the faucet (link below)</li>
            <li>Copy <code className="text-ritual-accent">contracts/.env.example</code> to <code className="text-ritual-accent">contracts/.env</code> and fill in your keys</li>
            <li>Run: <code className="text-ritual-accent block mt-1 ml-4">cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url $RITUAL_RPC_URL --broadcast -vvvv</code></li>
            <li>Copy the contract address to <code className="text-ritual-accent">frontend/.env.local</code></li>
            <li>Restart: <code className="text-ritual-accent">npm run dev</code></li>
          </ol>
          <a
            href="https://faucet.ritualfoundation.org"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-3 text-ritual-accent underline"
          >
            → GET_TESTNET_RITUAL
          </a>
        </div>
      </div>
    );
  }

  const marketIds = count !== undefined
    ? Array.from({ length: Number(count) }, (_, i) => BigInt(i))
    : [];

  return (
    <div>
      {/* Header */}
      <header className="mb-8 border-l-4 border-ritual-accent pl-6 py-2">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              ACTIVE_PREDICTION_MARKETS
            </h1>
            <p className="text-sm text-ritual-muted max-w-2xl">
              Real-time weather prediction markets resolved on-chain via the Ritual HTTP precompile (0x0801).
              No oracle, no off-chain bot — a TEE executor fetches OpenWeather data directly from Solidity.
            </p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-[10px] text-ritual-muted uppercase tracking-widest mb-1">TOTAL_MARKETS</div>
            <div className="text-2xl text-ritual-accent">
              {count !== undefined ? count.toString() : "..."}
            </div>
          </div>
        </div>
      </header>

      {/* Monitoring grid */}
      {count === undefined ? (
        <div className="text-ritual-muted text-sm text-center py-8">LOADING_MARKETS...</div>
      ) : count === BigInt(0) ? (
        <div className="text-ritual-muted text-sm text-center py-8 terminal-border">
          NO_MARKETS_YET. Use the [+] button to create the first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketIds.reverse().map((id) => (
            <MarketGridCard key={id.toString()} marketId={id} />
          ))}
        </div>
      )}

      <TeeVerificationLog />

      <CreateMarket onCreated={refetchCount} />
    </div>
  );
}
