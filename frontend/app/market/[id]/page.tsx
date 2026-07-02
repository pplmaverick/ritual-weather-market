"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ChainGuard = dynamic(() => import("@/components/ChainGuard").then((m) => m.ChainGuard), { ssr: false });
const MarketDetail = dynamic(() => import("@/components/MarketDetail").then((m) => m.MarketDetail), { ssr: false });

export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();

  let marketId: bigint | undefined;
  try {
    marketId = BigInt(params.id);
  } catch {
    marketId = undefined;
  }

  if (marketId === undefined) {
    return <div className="text-ritual-red text-sm">INVALID_MARKET_ID</div>;
  }

  return (
    <ChainGuard>
      <MarketDetail marketId={marketId} />
    </ChainGuard>
  );
}
