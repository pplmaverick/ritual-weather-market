import type { Address } from "viem";

// Deployed WeatherMarket contract — set via NEXT_PUBLIC_MARKET_ADDRESS after deployment
export const MARKET_ADDRESS = (
  process.env.NEXT_PUBLIC_MARKET_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as Address;

// Ritual system contracts — fixed addresses, same across all Ritual Chain deployments
export const RITUAL_WALLET  = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;
export const TEE_REGISTRY   = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;
export const HTTP_PRECOMPILE = "0x0000000000000000000000000000000000000801" as const;
