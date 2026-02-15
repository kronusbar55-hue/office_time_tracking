"use client";

import { useTimeTracking } from "./TimeTrackingProvider";

function formatHHMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

export default function RealTimeTimer() {
  const { workedMs, currentBreakMs, ongoingBreak, remainingMs, shiftHoursTarget } = useTimeTracking();

  const displayMs = ongoingBreak ? currentBreakMs : workedMs;
  const label = ongoingBreak ? "Break Duration" : "Work Time";
  const showCountdown = !ongoingBreak && shiftHoursTarget > 0 && remainingMs > 0;

  return (
    <div className="text-center py-6">
      <p className="text-xs uppercase text-slate-500 font-semibold mb-2">{label}</p>
      <p className="text-5xl font-bold font-mono text-orange-600 mb-4">
        {formatHHMMSS(displayMs)}
      </p>

      {showCountdown && (
        <div className="mx-auto max-w-sm rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 mb-4">
          <p className="text-[10px] uppercase text-slate-400 font-semibold mb-1">Remaining to {shiftHoursTarget}h</p>
          <p className="font-mono text-xl font-bold text-cyan-400">{formatHHMMSS(remainingMs)}</p>
        </div>
      )}
    </div>
  );
}
