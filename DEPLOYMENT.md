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

No bets placed on MKT_12–15 as of 2026-07-16.

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
