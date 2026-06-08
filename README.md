# Ritual Weather Market

![Network](https://img.shields.io/badge/Ritual_Testnet-Chain_ID_1979-6366f1)
![Solidity](https://img.shields.io/badge/Solidity-0.8.20-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-26%2F26_passing-brightgreen)

On-chain weather prediction market where `resolveMarket()` calls the OpenWeather API **directly from Solidity** via Ritual's TEE HTTP Precompile. No oracle bot, no VPS, no off-chain infrastructure — just a smart contract and a TEE executor.

**Deployed on Ritual Testnet**

| Field | Value |
|---|---|
| Network | Ritual Testnet |
| Chain ID | 1979 |
| Contract | [`0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f`](https://explorer.ritualfoundation.org/address/0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f) |
| RPC | `https://rpc.ritualfoundation.org` |

---

## Why Ritual-Native

This project is not a generic EVM dApp ported to another chain. Every design decision maps to a Ritual-specific primitive.

| Problem | Generic EVM approach | Ritual-native approach |
|---|---|---|
| Fetch weather data | Off-chain oracle bot (Chainlink, API3) pushes data on-chain | TEE HTTP Precompile (`0x0801`) — `resolveMarket()` calls OpenWeather API directly from Solidity |
| Off-chain infrastructure | VPS running 24/7 to push price feeds | Zero off-chain components; contract is self-contained |
| Settlement trust | Trust oracle operator's integrity | TEE-attested execution; result verifiable on-chain by anyone |
| Resolution trigger | Dedicated keeper bot with private key | Any user can call `resolveMarket()` — permissionless |
| API key security | Plaintext in bot environment / secrets manager | ECIES-encrypted in contract state; decrypted only inside TEE (production path) |

---

## Architecture

```
┌─────────────┐   createMarket()    ┌───────────────────────────────┐
│    Anyone   │ ──────────────────▶ │                               │
│             │   placeBet()        │     WeatherMarket.sol         │
│             │ ──────────────────▶ │     Chain ID: 1979            │
│             │   resolveMarket()   │     0x072A3A...531f           │
│             │ ──────────────────▶ │                               │
└─────────────┘                     └──────────────┬────────────────┘
                                                   │ call(0x0801)
                                                   │ HTTP Precompile
                                                   ▼
                                    ┌──────────────────────────────┐
                                    │   TEE Executor               │
                                    │   (TEEServiceRegistry)       │
                                    └──────────────┬───────────────┘
                                                   │ HTTPS GET
                                                   ▼
                                    ┌──────────────────────────────┐
                                    │  api.openweathermap.org      │
                                    │  /data/2.5/weather?q=...     │
                                    └──────────────┬───────────────┘
                                                   │ actual temp
                                    Fulfilled replay: result injected
                                    back on-chain; market settled
                                                   │
                                                   ▼
                                         Winners call claim()
```

**SPC execution model (short-running async):**

1. **Simulation** — block builder simulates `resolveMarket()`; HTTP precompile returns empty `actualOutput`; function exits early without mutating state
2. **TEE execution** — verified executor fetches OpenWeather API response off-chain inside a TEE
3. **Fulfilled replay** — transaction re-executes with real HTTP response injected; contract parses temperature, settles market on-chain

---

## Core Features

- **Permissionless market creation** — anyone creates a city/temperature pair with custom deadlines
- **Two-sided betting** — bet RITUAL on "above" or "below" target temperature
- **On-chain HTTP resolution** — `resolveMarket()` triggers the TEE HTTP Precompile directly from Solidity
- **Proportional payout** — winners share the full pool; one-sided markets are refunded
- **RitualWallet integration** — frontend auto-detects executor fee balance and prompts top-up

---

## Deployed Contracts

**Ritual Testnet (Chain ID: 1979)**

| Contract | Address |
|---|---|
| WeatherMarket | `0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f` |
| RitualWallet (system) | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` |
| TEEServiceRegistry (system) | `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F` |
| HTTP Precompile (system) | `0x0000000000000000000000000000000000000801` |

---

## Quick Start

### Prerequisites

| Tool | Notes |
|---|---|
| [Foundry](https://getfoundry.sh/) | `curl -L https://foundry.paradigm.xyz \| bash` |
| Node.js ≥ 18 | For the frontend |
| OpenWeather API key | Free tier — [openweathermap.org](https://openweathermap.org/api) |
| Testnet RITUAL | [faucet.ritualfoundation.org](https://faucet.ritualfoundation.org) |

### 1. Clone & install

```bash
git clone https://github.com/pplmaverick/ritual-weather-market
cd ritual-weather-market
```

### 2. Configure contracts

```bash
cp contracts/.env.example contracts/.env
# Edit contracts/.env with your keys
```

| Variable | Description |
|---|---|
| `PRIVATE_KEY` | Deployer private key (`0x`-prefixed) |
| `OPENWEATHER_API_KEY` | OpenWeather API key |
| `RITUAL_RPC_URL` | Default: `https://rpc.ritualfoundation.org` |

### 3. Compile & test

```bash
cd contracts
forge build
forge test        # 26/26 tests pass
```

### 4. Deposit into your personal RitualWallet

The Ritual mempool checks the **transaction sender's** RitualWallet balance before including any HTTP precompile call. Deposit before deploying or resolving markets.

```bash
cast send 0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948 \
  "deposit(uint256)" 100000 \
  --value 0.02ether \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.ritualfoundation.org
```

### 5. Deploy

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $RITUAL_RPC_URL \
  --broadcast -vvv
```

Note the deployed address, then:

```bash
cd ../frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_MARKET_ADDRESS=0xYOUR_DEPLOYED_ADDRESS
```

### 6. Run frontend

```bash
npm install
npm run dev        # http://localhost:3000
```

---

## Contract Interface

```solidity
// Create a new prediction market
function createMarket(
    string  memory city,          // OpenWeather city name, e.g. "Tokyo,JP"
    int256  targetTemp,           // Celsius × 100, e.g. 2000 = 20.00°C
    uint256 bettingDeadline,      // Unix timestamp in milliseconds (Ritual Chain)
    uint256 resolutionTime        // Unix timestamp in ms, must be ≥ bettingDeadline
) external returns (uint256 id);

// Place a bet — msg.value is the bet amount in RITUAL
function placeBet(uint256 marketId, bool isAbove) external payable;

// Resolve market via HTTP precompile (caller needs personal RitualWallet balance)
function resolveMarket(uint256 marketId) external;

// Claim winnings from a resolved market
function claim(uint256 marketId) external;

// Read full market state
function getMarket(uint256 marketId) external view returns (
    string memory city,
    int256  targetTemp,
    uint256 bettingDeadline,
    uint256 resolutionTime,
    uint256 totalAbove,
    uint256 totalBelow,
    bool    resolved,
    bool    resultIsAbove,
    int256  actualTemp
);

// Read a user's bets on a market
function getUserBets(uint256 marketId, address user) external view returns (
    uint256 aboveBet,
    uint256 belowBet,
    bool    hasClaimed
);
```

---

## Temperature Encoding

Temperatures are stored as `int256` with two-decimal-place precision (Celsius × 100):

```
 2000  →  20.00°C
 2555  →  25.55°C
-320   →  -3.20°C
```

The frontend accepts plain integer or decimal Celsius input (e.g. `20` or `25.5`) and converts to the contract representation automatically. OpenWeather responses are parsed on-chain by `_parseTemp()` in the contract.

**Payout formula:**

```
payout = (userBet / winningTotal) × totalPot
```

If nobody bet on the winning side, all bets on the other side are fully refunded.

---

## Fees & Security

**Executor fees**

| Item | Amount |
|---|---|
| Base fee per `resolveMarket()` | ~0.0000025 RITUAL |
| Per-byte fee (input + output) | 0.35 gwei/byte |
| Typical resolve cost | ~0.000005 RITUAL |
| Recommended personal RitualWallet deposit | 0.01 RITUAL (~2,000 calls) |

The fee is deducted from the **transaction sender's personal RitualWallet balance**, not from the contract's balance. See Implementation Notes.

**Protocol fees:** none — 100% of the pool goes to winners.

**Security properties:**
- Bets are locked in the contract until resolution
- `claim()` uses a per-address `hasClaimed` flag to prevent double-claim
- `resolveMarket()` has an `AlreadyResolved` guard — idempotent after settlement
- Executor is selected from `TEEServiceRegistry` with `checkValidity = true`
- Only one short-running async precompile commitment per sender per block (Ritual network policy)

---

## Implementation Notes

Three non-obvious Ritual Chain behaviors encountered during development:

**1. RitualWallet fee is charged to `tx.origin` (EOA), not the calling contract**

When a user calls `resolveMarket()`, Ritual's mempool validates the **transaction sender's personal RitualWallet balance** before including the transaction. The contract's own `depositFees()` function deposits into the *contract's* RitualWallet account — this is not what the mempool checks.

If the EOA's balance is zero, the transaction is rejected with:
```
error -32602: invalid async payload: insufficient wallet balance
```

The frontend shows a yellow banner + "Deposit 0.01 RITUAL to RitualWallet" button whenever the connected wallet's balance falls below 0.005 RITUAL.

**2. MetaMask simulation fails for functions that transfer ETH back to `msg.sender`**

`eth_call` (used internally by wagmi's `simulateContract` and by MetaMask before showing the confirmation dialog) reverts on Ritual Chain when a contract executes `msg.sender.call{value: amount}("")`. This affects both `resolveMarket()` (HTTP precompile simulation returns empty output) and `claim()` (ETH payout back to caller).

MetaMask shows a "Review alert" and gas fee of 0 when simulation fails, locking the confirm button.

Fix: use `sendTransactionAsync + encodeFunctionData` instead of `writeContractAsync`. This bypasses wagmi's `simulateContract` step entirely.

```typescript
// ✗ triggers simulateContract — fails on Ritual for ETH-returning functions
writeContractAsync({ functionName: "claim", args: [marketId] })

// ✓ skips simulation — works correctly
sendTransactionAsync({
  to: MARKET_ADDRESS,
  data: encodeFunctionData({ abi, functionName: "claim", args: [marketId] }),
  gas: BigInt(200_000),
})
```

**3. Ritual Chain `block.timestamp` is in milliseconds**

Unlike standard EVM chains (seconds), Ritual's `block.timestamp` is measured in **milliseconds**. All deadline and resolution time values passed to `createMarket()` must be in milliseconds. Using `Date.now()` directly is correct — do not divide by 1000.

```typescript
// ✗ wrong — seconds-based; deadline is immediately "in the past" on Ritual
const deadline = Math.floor(Date.now() / 1000) + hoursUntilDeadline * 3600

// ✓ correct — milliseconds, matching Ritual's block.timestamp
const deadline = Date.now() + hoursUntilDeadline * 3600 * 1000
```

Also: wagmi's multicall3 must be explicitly disabled for Ritual Testnet. Leaving the default multicall3 address in the chain config causes wagmi to silently fail all batched `useReadContract` calls (the contract address has no code on Ritual Testnet). Remove `contracts.multicall3` from the chain definition — wagmi falls back to individual `eth_call` per read.

---

## Stack

| Layer | Technology |
|---|---|
| Smart contract | Solidity ^0.8.20 |
| Development & testing | Foundry (`forge` + `cast`) |
| Oracle | Ritual TEE HTTP Precompile `0x0801` — zero off-chain components |
| Frontend | Next.js 14 + TypeScript + wagmi v2 + RainbowKit v2 |

---

## Roadmap

**M1 — Testnet Deployment ✅**
- WeatherMarket contract deployed on Ritual Testnet
- TEE HTTP Precompile integration — `resolveMarket()` calls OpenWeather API on-chain
- Full market lifecycle: create → bet → resolve → claim
- Next.js frontend with wallet connect, market creation, betting, and claim UI
- End-to-end tested: market resolved at Taipei,TW 25.55°C, payout claimed

**M2 — UX & Multi-Market ⬜**
- Permissionless market creation from frontend
- Auto-deposit RitualWallet flow (one-click top-up before resolve)
- Historical resolved markets view
- Multiple concurrent markets

**M3 — Mainnet ⬜**
- ECIES secret injection for API key (key encrypted on-chain, decrypted only inside TEE)
- Security audit
- Mainnet deployment

---

## Developer

GitHub: [pplmaverick](https://github.com/pplmaverick)
Wallet: `0xed2B5717c9b936ecC76d75401026A99143e278F5`

---

## License

MIT
