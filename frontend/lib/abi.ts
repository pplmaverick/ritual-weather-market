export const WEATHER_MARKET_ABI = [
  // ── Write functions ─────────────────────────────────────────────────────────
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "city",            type: "string"  },
      { name: "targetTemp",      type: "int256"  },
      { name: "bettingDeadline", type: "uint256" },
      { name: "resolutionTime",  type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    name: "placeBet",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "isAbove",  type: "bool"    },
    ],
    outputs: [],
  },
  {
    name: "resolveMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "depositFees",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },

  // ── View functions ──────────────────────────────────────────────────────────
  {
    name: "marketCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "city",            type: "string"  },
      { name: "targetTemp",      type: "int256"  },
      { name: "bettingDeadline", type: "uint256" },
      { name: "resolutionTime",  type: "uint256" },
      { name: "totalAbove",      type: "uint256" },
      { name: "totalBelow",      type: "uint256" },
      { name: "resolved",        type: "bool"    },
      { name: "resultIsAbove",   type: "bool"    },
      { name: "actualTemp",      type: "int256"  },
    ],
  },
  {
    name: "getUserBets",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address" },
    ],
    outputs: [
      { name: "aboveBet",   type: "uint256" },
      { name: "belowBet",   type: "uint256" },
      { name: "hasClaimed", type: "bool"    },
    ],
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  {
    name: "MarketCreated",
    type: "event",
    inputs: [
      { name: "id",              type: "uint256", indexed: true  },
      { name: "city",            type: "string",  indexed: false },
      { name: "targetTemp",      type: "int256",  indexed: false },
      { name: "bettingDeadline", type: "uint256", indexed: false },
      { name: "resolutionTime",  type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    inputs: [
      { name: "id",            type: "uint256", indexed: true  },
      { name: "actualTemp",    type: "int256",  indexed: false },
      { name: "resultIsAbove", type: "bool",    indexed: false },
    ],
  },
  {
    name: "BetPlaced",
    type: "event",
    inputs: [
      { name: "id",      type: "uint256", indexed: true  },
      { name: "bettor",  type: "address", indexed: true  },
      { name: "isAbove", type: "bool",    indexed: false },
      { name: "amount",  type: "uint256", indexed: false },
    ],
  },
  {
    name: "Claimed",
    type: "event",
    inputs: [
      { name: "id",     type: "uint256", indexed: true  },
      { name: "bettor", type: "address", indexed: true  },
      { name: "payout", type: "uint256", indexed: false },
    ],
  },
] as const;

export const RITUAL_WALLET_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "lockDuration", type: "uint256" }],
    outputs: [],
  },
] as const;
