const settlements = [
  { market: "MKT_0", city: "Taipei, TW", threshold: ">20.00°C", actual: "25.55°C", outcome: "ABOVE_WIN", refunded: false, date: "2026-06-08" },
  { market: "MKT_1", city: "Taipei, TW", threshold: ">25.00°C", actual: "28.33°C", outcome: "ABOVE_WIN", refunded: false, date: "2026-06-14" },
  { market: "MKT_2", city: "Tokyo, JP", threshold: ">25.00°C", actual: "22.75°C", outcome: "BELOW_WIN", refunded: true, date: "2026-06-18" },
  { market: "MKT_3", city: "Seoul, KR", threshold: ">22.00°C", actual: "31.10°C", outcome: "ABOVE_WIN", refunded: false, date: "2026-06-18" },
  { market: "MKT_5", city: "Tokyo, JP", threshold: ">30.00°C", actual: "24.77°C", outcome: "BELOW_WIN", refunded: false, date: "2026-07-09" },
  { market: "MKT_7", city: "Bangkok, TH", threshold: ">32.00°C", actual: "27.18°C", outcome: "BELOW_WIN", refunded: true, date: "2026-07-09" },
  { market: "MKT_9", city: "Tokyo, JP", threshold: ">30.00°C", actual: "27.74°C", outcome: "BELOW_WIN", refunded: false, date: "2026-07-14" },
  { market: "MKT_10", city: "Bangkok, TH", threshold: ">32.00°C", actual: "29.95°C", outcome: "BELOW_WIN", refunded: true, date: "2026-07-14" },
];

// MKT_4, MKT_6, MKT_8, MKT_11 resolved with zero bets on either side and are omitted —
// resolveMarket() reverts with NoBetsPlaced() for those, so they never settle on-chain.

export function SettlementHistory() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold tracking-tight mb-1">SETTLEMENT_HISTORY</h2>
      <p className="text-xs text-ritual-muted mb-4">
        On-chain record — full breakdown in{" "}
        <a
          href="https://github.com/pplmaverick/ritual-weather-market/blob/main/DEPLOYMENT.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ritual-accent underline"
        >
          DEPLOYMENT.md
        </a>
        .
      </p>
      <div className="terminal-border bg-ritual-panel overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ritual-border text-ritual-muted uppercase tracking-widest">
              <th className="text-left p-3">Market</th>
              <th className="text-left p-3">City</th>
              <th className="text-left p-3">Threshold</th>
              <th className="text-left p-3">Actual</th>
              <th className="text-left p-3">Outcome</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.market} className="border-b border-ritual-border/40 hover:bg-ritual-accent/5">
                <td className="p-3 text-ritual-muted">{s.market}</td>
                <td className="p-3">{s.city}</td>
                <td className="p-3 text-ritual-muted">{s.threshold}</td>
                <td className="p-3">{s.actual}</td>
                <td className={`p-3 font-bold ${s.outcome === "ABOVE_WIN" ? "text-ritual-accent" : "text-ritual-red"}`}>
                  {s.outcome}
                  {s.refunded && <span className="block font-normal text-ritual-yellow">(above bettor refunded)</span>}
                </td>
                <td className="p-3 text-ritual-muted">{s.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
