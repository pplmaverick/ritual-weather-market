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

  if (isSuccess) {
    return (
      <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4 text-center">
        <p className="text-green-400 text-sm">Market created successfully.</p>
        <button
          onClick={() => { setOpen(false); onCreated?.(); }}
          className="mt-2 text-xs text-ritual-muted underline"
        >
          Close
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-ritual-border hover:border-ritual-orange
                   text-ritual-muted hover:text-ritual-orange text-sm rounded-lg p-4
                   transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span> Create New Market
      </button>
    );
  }

  return (
    <div className="border border-ritual-border bg-ritual-surface rounded-lg p-5">
      <h2 className="text-sm font-bold text-ritual-orange mb-4 uppercase tracking-wider">
        New Market
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-ritual-muted mb-1">City</label>
          <input
            className="w-full bg-ritual-bg border border-ritual-border rounded px-3 py-2
                       text-sm text-white placeholder-ritual-muted focus:border-ritual-orange
                       focus:outline-none"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder='e.g. "Tokyo,JP" or "New York"'
            required
          />
          <p className="text-xs text-ritual-muted mt-1">
            OpenWeather city name. Append ,CC for country code to avoid ambiguity.
          </p>
        </div>

        <div>
          <label className="block text-xs text-ritual-muted mb-1">Target Temperature (°C)</label>
          <input
            type="number"
            step="0.1"
            className="w-full bg-ritual-bg border border-ritual-border rounded px-3 py-2
                       text-sm text-white focus:border-ritual-orange focus:outline-none"
            value={targetTemp}
            onChange={(e) => setTargetTemp(e.target.value)}
            required
          />
          <p className="text-xs text-ritual-muted mt-1">
            Users bet whether actual temp will be above or below this value.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-ritual-muted mb-1">Betting closes in (hours)</label>
            <input
              type="number"
              min="1"
              className="w-full bg-ritual-bg border border-ritual-border rounded px-3 py-2
                         text-sm text-white focus:border-ritual-orange focus:outline-none"
              value={hoursUntilDeadline}
              onChange={(e) => setHoursUntilDeadline(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-ritual-muted mb-1">Resolve after (minutes)</label>
            <input
              type="number"
              min="5"
              className="w-full bg-ritual-bg border border-ritual-border rounded px-3 py-2
                         text-sm text-white focus:border-ritual-orange focus:outline-none"
              value={minutesAfterDeadline}
              onChange={(e) => setMinutesAfterDeadline(e.target.value)}
              required
            />
          </div>
        </div>

        {localError && (
          <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
            {localError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending || isConfirming}
            className="flex-1 bg-ritual-orange text-white text-sm font-bold py-2 rounded
                       hover:bg-orange-400 transition-colors disabled:opacity-50"
          >
            {isPending ? "Confirm in wallet..." : isConfirming ? "Creating..." : "Create Market"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="px-4 py-2 border border-ritual-border text-ritual-muted text-sm
                       rounded hover:border-white hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
