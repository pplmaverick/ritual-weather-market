"use client";

import { useEffect, useRef, useState } from "react";

type LogLevel = "INF" | "SYS" | "WRN";

interface LogLine {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

const SAMPLE_EVENTS: Array<{ level: LogLevel; message: string }> = [
  { level: "INF", message: "HEARTBEAT_SYNC_COMPLETED_SUCCESSFULLY" },
  { level: "INF", message: "NODE_RITUAL_01 POLLING_OPENWEATHER_ENDPOINT" },
  { level: "INF", message: "TEE_ATTESTATION_REQUEST_SENT" },
  { level: "SYS", message: "FETCHING_LATEST_MARKET_STATE..." },
  { level: "WRN", message: "AWAITING_FULFILLED_REPLAY_CONFIRMATION" },
];

function nowLabel(): string {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  INF: "text-ritual-accent",
  SYS: "text-ritual-purple",
  WRN: "text-ritual-yellow",
};

export function TeeVerificationLog() {
  const [lines, setLines] = useState<LogLine[]>(() => [
    { id: 0, time: nowLabel(), level: "INF", message: "TEE_VERIFICATION_STREAM_CONNECTED" },
  ]);
  const counter = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const event = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
      setLines((prev) => {
        const next = [...prev, { id: counter.current++, time: nowLabel(), ...event }];
        return next.length > 20 ? next.slice(next.length - 20) : next;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  return (
    <section className="mt-12 terminal-border bg-ritual-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[11px] font-bold tracking-widest uppercase text-ritual-text">
          TEE_VERIFICATION_LOG
        </h2>
        <span className="text-xs text-ritual-accent opacity-50">FILTER: [ALL_EVENTS]</span>
      </div>
      <div ref={scrollRef} className="text-xs space-y-2 opacity-80 h-32 overflow-y-auto pr-4" suppressHydrationWarning>
        {lines.map((line) => (
          <div key={line.id}>
            [{line.time}] <span className={LEVEL_COLOR[line.level]}>{line.level}:</span> {line.message}
          </div>
        ))}
      </div>
    </section>
  );
}
