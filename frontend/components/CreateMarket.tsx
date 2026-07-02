"use client";

import { useState } from "react";
import { useCreateMarket } from "@/hooks/useWeatherMarket";

interface Props {
  onCreated?: () => void;
}

export function CreateMarket({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState("London,GB");
  const [targetTemp, setTargetTemp] = useState("20");
  const [hoursUntilDeadline, setHoursUntilDeadline] = useState("1");
  const [minutesAfterDeadline, setMinutesAfterDeadline] = useState("10");
  const [localError, setLocalError] = useState<string | undefined>();

  const { create, isPending, isConfirming, isSuccess } = useCreateMarket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(undefined);
    try {
      // Ritual Chain block.timestamp is in milliseconds
      const now = Date.now();
      const bettingDeadline = now + parseInt(hoursUntilDeadline) * 3600 * 1000;
      const resolutionTime  = bettingDeadline + parseInt(minutesAfterDeadline) * 60 * 1000;
      await create(city, targetTemp, bettingDeadline, resolutionTime);
    } catch (e) {
      setLocalError((e as Error).message);
    }
  };

  const close = () => {
    setOpen(false);
    setLocalError(undefined);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Create new market"
        className="fixed bottom-20 right-6 md:bottom-12 md:right-12 w-16 h-16 bg-ritual-accent text-ritual-bg
                   rounded-full flex items-center justify-center text-3xl font-bold
                   shadow-[0_0_20px_rgba(0,255,136,0.5)] z-50 hover:scale-110 active:scale-95 transition-all"
      >
        +
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4">
          <div className="terminal-border-strong bg-ritual-bg crt-glow max-w-md w-full p-6 relative">
            <button
              onClick={close}
              aria-label="Close"
              className="absolute top-3 right-4 text-ritual-muted hover:text-ritual-accent text-lg"
            >
              [X]
            </button>

            <h2 className="text-sm font-bold text-ritual-accent mb-6 uppercase tracking-widest">
              CREATE_NEW_MARKET
            </h2>

            {isSuccess ? (
              <div className="text-center space-y-4 py-4">
                <p className="text-ritual-accent text-sm">MARKET_CREATED_SUCCESSFULLY</p>
                <button
                  onClick={() => { close(); onCreated?.(); }}
                  className="text-xs text-ritual-muted underline"
                >
                  CLOSE
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-ritual-muted mb-1 tracking-widest">CITY</label>
                  <input
                    className="w-full bg-transparent border-0 border-b border-ritual-border px-0 py-2
                               text-sm text-ritual-text placeholder-ritual-muted focus:border-ritual-accent
                               focus:outline-none focus:ring-0"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder='e.g. "Tokyo,JP" or "New York"'
                    required
                  />
                  <p className="text-[10px] text-ritual-muted mt-1">
                    OPENWEATHER_CITY_NAME. APPEND ,CC FOR COUNTRY CODE.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] text-ritual-muted mb-1 tracking-widest">
                    TARGET_TEMPERATURE (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-transparent border-0 border-b border-ritual-border px-0 py-2
                               text-sm text-ritual-text focus:border-ritual-accent focus:outline-none focus:ring-0"
                    value={targetTemp}
                    onChange={(e) => setTargetTemp(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-ritual-muted mb-1 tracking-widest">
                      CLOSES_IN (HRS)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-transparent border-0 border-b border-ritual-border px-0 py-2
                                 text-sm text-ritual-text focus:border-ritual-accent focus:outline-none focus:ring-0"
                      value={hoursUntilDeadline}
                      onChange={(e) => setHoursUntilDeadline(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ritual-muted mb-1 tracking-widest">
                      RESOLVE_AFTER (MIN)
                    </label>
                    <input
                      type="number"
                      min="5"
                      className="w-full bg-transparent border-0 border-b border-ritual-border px-0 py-2
                                 text-sm text-ritual-text focus:border-ritual-accent focus:outline-none focus:ring-0"
                      value={minutesAfterDeadline}
                      onChange={(e) => setMinutesAfterDeadline(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {localError && (
                  <p className="text-ritual-red text-xs border border-ritual-red/30 bg-ritual-red/10 px-3 py-2">
                    {localError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isPending || isConfirming}
                    className="flex-1 border border-ritual-accent text-ritual-accent text-sm font-bold py-3
                               uppercase tracking-widest hover:bg-ritual-accent hover:text-ritual-bg
                               transition-all disabled:opacity-50"
                  >
                    {isPending ? "CONFIRM_IN_WALLET..." : isConfirming ? "CREATING..." : "[EXECUTE_CREATE]"}
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="px-4 py-3 border border-ritual-border text-ritual-muted text-sm
                               hover:border-ritual-text hover:text-ritual-text transition-colors"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
