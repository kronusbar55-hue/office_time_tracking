"use client";

import { Clock, LogOut, Coffee, Square } from "lucide-react";
import { useTimeTracking } from "./TimeTrackingProvider";

type Props = {
  onClockOutRequested?: () => void;
};

export default function ActionButtons({ onClockOutRequested }: Props) {
  const { active, ongoingBreak, busy, clockIn, clockOut, startBreak, endBreak } = useTimeTracking();

  const baseClass =
    "inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";

  return (
    <div className="flex flex-wrap gap-3">
      {!active ? (
        <button
          disabled={busy}
          onClick={clockIn}
          className={`${baseClass} bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40`}
        >
          <Clock className="h-5 w-5" />
          {busy ? "Processing..." : "Clock In"}
        </button>
      ) : (
        <>
          <button
            disabled={busy}
            onClick={onClockOutRequested ?? clockOut}
            className={`${baseClass} bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40`}
          >
            <LogOut className="h-5 w-5" />
            {busy ? "Processing..." : "Clock Out"}
          </button>
          {!ongoingBreak ? (
            <button
              disabled={busy}
              onClick={startBreak}
              className={`${baseClass} bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40`}
            >
              <Coffee className="h-5 w-5" />
              {busy ? "Processing..." : "Start Break"}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={endBreak}
              className={`${baseClass} bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40`}
            >
              <Square className="h-5 w-5" />
              {busy ? "Processing..." : "End Break"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
