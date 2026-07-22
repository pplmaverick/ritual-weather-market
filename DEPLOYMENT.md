# Deployment & Settlement Records

All data below was pulled directly from chain state (`getMarket()` calls against the deployed
contract) on 2026-07-16 — not from off-chain notes. tx hashes are intentionally omitted; none
could be independently verified within a reasonable scan of the chain's event logs, so we're not
publishing guessed ones. Verify any market yourself with:

```bash
cast call 0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f \
  "getMarket(uint256)(string,int256,uint256,uint256,uint256,uint256,bool,bool,int256)" <marketId> \
  --rpc-url https://rpc.ritualfoundation.org
```

## Contract

| Network | Address | Chain ID |
|---|---|---|
| Ritual Testnet | [`0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f`](https://explorer.ritualfoundation.org/address/0x072A3A0C04Cf8CDcaf5B4A73a4Ed4fF5A841531f) | 1979 |

This is the contract matching the currently-committed `WeatherMarket.sol` (unchanged since the
initial commit). A local, uncommitted fee-handling fix has been test-deployed separately to
`0x7ebc98c14920c9a9b060b81047ec96a8906b06c1`; that address has no market history yet (one tiny
test market only) and is not part of this record.

## Market Settlement History

`targetTemp`/`actualTemp` are Celsius. Threshold is always "actual > target".

### Early tests (MKT_0–3)

| Market | City | Threshold | Bets (above / below) | Result | Status |
|---|---|---|---|---|---|
| MKT_0 | Taipei, TW | >20.00°C | 0.001 / 0 RITUAL | 25.55°C — ABOVE wins | ✅ Settled (2026-06-08) |
| MKT_1 | Taipei, TW | >25.00°C | 0.003 / 0.002 RITUAL | 28.33°C — ABOVE wins | ✅ Settled (2026-06-14) |
| MKT_2 | Tokyo, JP | >25.00°C | 0.001 / 0 RITUAL | 22.75°C — BELOW wins (above bettor refunded) | ✅ Settled (2026-06-18) |
| MKT_3 | Seoul, KR | >22.00°C | 0.001 / 0 RITUAL | 31.10°C — ABOVE wins | ✅ Settled (2026-06-18) |

### Round 2 (MKT_4–7, batch deadline 2026-07-09 13:13 UTC)

| Market | City | Threshold | Bets (above / below) | Result | Status |
|---|---|---|---|---|---|
| MKT_4 | Taipei, TW | >28.00°C | — | Zero bets | ⏭ Skipped |
| MKT_5 | Tokyo, JP | >30.00°C | 0 / 0.002 RITUAL | 24.77°C — BELOW wins | ✅ Settled |
| MKT_6 | Seoul, KR | >28.00°C | — | Zero bets | ⏭ Skipped |
| MKT_7 | Bangkok, TH | >32.00°C | 0.002 / 0 RITUAL | 27.18°C — BELOW wins (above bettor refunded) | ✅ Settled |

### Round 3 (MKT_8–11, batch deadline 2026-07-14 13:00 UTC)

| Market | City | Threshold | Bets (above / below) | Result | Status |
|---|---|---|---|---|---|
| MKT_8 | Taipei, TW | >32.00°C | — | Zero bets | ⏭ Skipped |
| MKT_9 | Tokyo, JP | >30.00°C | 0 / 0.01 RITUAL | 27.74°C — BELOW wins | ✅ Settled |
| MKT_10 | Bangkok, TH | >32.00°C | 0.02 / 0 RITUAL | 29.95°C — BELOW wins (above bettor refunded) | ✅ Settled |
| MKT_11 | Seoul, KR | >28.00°C | — | Zero bets | ⏭ Skipped |

### Round 4 / Active Markets (MKT_12–15)

| Market | City | Threshold | bettingDeadline | resolutionTime |
|---|---|---|---|---|
| MKT_12 | Taipei, TW | >30.00°C | 2026-07-21 14:00 UTC | 2026-07-21 15:00 UTC |
| MKT_13 | Tokyo, JP | >28.00°C | 2026-07-21 14:00 UTC | 2026-07-21 15:00 UTC |
| MKT_14 | Bangkok, TH | >30.00°C | 2026-07-21 14:00 UTC | 2026-07-21 15:00 UTC |
| MKT_15 | Seoul, KR | >28.00°C | 2026-07-21 14:00 UTC | 2026-07-21 15:00 UTC |

No bets placed on MKT_12–15 as of 2026-07-16. MKT_12–13 stayed zero-bet through their deadline;
MKT_14–15 received bets and were settled in Round 5 — see below.

### Round 5 Settlement (MKT_12–15, 2026-07-22)

| Market | City | Threshold | Bets (above / below) | Result | Status |
|---|---|---|---|---|---|
| MKT_12 | Taipei, TW | >30.00°C | — | Zero bets | ⏭ Skipped |
| MKT_13 | Tokyo, JP | >28.00°C | — | Zero bets | ⏭ Skipped |
| MKT_14 | Bangkok, TH | >30.00°C | 0.005 / 0 RITUAL | 35.33°C — ABOVE wins | ✅ Settled |
| MKT_15 | Seoul, KR | >28.00°C | 0 / 0.007 RITUAL | 29.77°C — ABOVE wins (below bettor refunded) | ✅ Settled |

Transaction hashes:
- MKT_14 — resolveMarket: `0xfde462451ba70b354614acd530714f0d13e999f1aa295c7f313d45e80ad026d5`, claim: `0x03ccd33feea3f64e2f39847120352b1759696dc08a577ed548c924a4068f34dc`
- MKT_15 — resolveMarket: `0x8afcadc230a374dee038ec5e30b94f7d822f886da686caa31a762f18497d1618`, claim: `0xa8d8c26089ebf9d25731af4931e3cf96c47bf4a33faf4f88b1f661a2608d5f8e`

### Round 6 Markets (MKT_16–19, created 2026-07-22)

| Market | City | Threshold | bettingDeadline | resolutionTime |
|---|---|---|---|---|
| MKT_16 | Taipei, TW | >30.00°C | 2026-07-28 14:00 UTC | 2026-07-28 15:00 UTC |
| MKT_17 | Tokyo, JP | >28.00°C | 2026-07-28 14:00 UTC | 2026-07-28 15:00 UTC |
| MKT_18 | Bangkok, TH | >32.00°C | 2026-07-28 14:00 UTC | 2026-07-28 15:00 UTC |
| MKT_19 | Seoul, KR | >28.00°C | 2026-07-28 14:00 UTC | 2026-07-28 15:00 UTC |

Each market seeded with one 0.001 RITUAL "above" bet from the deployer wallet.

Transaction hashes:
- MKT_16 — createMarket: `0x2f8e84b3ddf509e8b3be5bbc9accb9780179500de8777daa6704ee769e388e25`, placeBet: `0x9f806addd2411c0aa7564b99ec25909c05b1b2bf1e53860af9f441c46aa6548c`
- MKT_17 — createMarket: `0x0cb1280bee08b112fe7153dfe07f0c49f3a9cf776d5b5437287ffe7e368cc00e`, placeBet: `0xaf40aa13b7f2b9543c6257a6c61379e4d6b92e539c6e47f354efd947b88f7578`
- MKT_18 — createMarket: `0x19089b801bd752eb235698062bb61850ed8b7eb9376b2a9dc7b0034dddd72427`, placeBet: `0xcba66646953fbae9cd41c9eda49e6e2b01408525d7b7dbf452be83fc3c0003b0`
- MKT_19 — createMarket: `0x3fe81b711367ea9a66a0c6a6c4d9cb9c2841ace25cc479c3db91ed04c192204c`, placeBet: `0x9396d8d43561558099470671fa7476af23670a0bc5d668b6c746b12fbfe36c24`

Deployer wallet balance after Round 6: 0.861332982797286642 RITUAL (nonce 96).

## Known Issues & Fixes

- `resolveMarket` requires `--gas-limit 2000000` — `cast`'s auto gas estimate is too low because it
  simulates the empty-result (first-phase) path, not the full real-data path taken once the TEE has
  fetched a response.
- `getMarket` tuple type: `(string,int256,uint256,uint256,uint256,uint256,bool,bool,int256)`
- `TEEServiceRegistry` correct address: `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F`
  function: `pickServiceByCapability(uint8,bool,uint256,uint256)`
- Claim function signature is `claim(uint256)`, not `claimWinnings(uint256)`
- Ritual Chain's `block.timestamp` is in milliseconds, not seconds

## On-Chain Activity (as of 2026-07-16)

| Metric | Count |
|---|---|
| Markets created | 16 (MKT_0–15) |
| Markets settled | 8 |
| Markets skipped (zero bets) | 4 |
| Markets active / pending | 4 |
| Deployer wallet tx count (nonce) | 81 |

The tx count is the deployer wallet's (`0xed2B5717...278F5`) total nonce on Ritual Testnet — it
covers all its activity (both WeatherMarket deploys, the ERC-8004 IdentityRegistry deploy, and
every market/bet/resolve call), not a filtered count of WeatherMarket calls alone.
