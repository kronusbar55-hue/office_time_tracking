"use client";

import { useTimeTracking } from "./TimeTrackingProvider";

function formatHHMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

export default function LiveTimerDisplay() {
  const { active, ongoingBreak, workedMs, currentBreakMs } = useTimeTracking();

  if (!active) return null;

  const displayMs = ongoingBreak ? currentBreakMs : workedMs;
  const label = ongoingBreak ? "Break" : "Work";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/60 px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
        {formatHHMMSS(displayMs)}
      </span>
    </div>
  );
}
