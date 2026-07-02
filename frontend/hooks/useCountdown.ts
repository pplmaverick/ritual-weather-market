"use client";

import { useEffect, useState } from "react";

/** Ticking [HH:MM:SS] countdown to a target ms timestamp. UI-only, no contract reads. */
export function useCountdown(targetMs: bigint | number | undefined): string {
  const [label, setLabel] = useState("[--:--:--]");

  useEffect(() => {
    if (targetMs === undefined) return;
    const target = Number(targetMs);

    const tick = () => {
      const remaining = Math.max(0, target - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      const h = Math.floor(totalSeconds / 3600)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((totalSeconds % 3600) / 60)
        .toString()
        .padStart(2, "0");
      const s = Math.floor(totalSeconds % 60)
        .toString()
        .padStart(2, "0");
      setLabel(`[${h}:${m}:${s}]`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  return label;
}
