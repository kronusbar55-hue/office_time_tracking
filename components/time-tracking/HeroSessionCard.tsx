"use client";

import { useTimeTracking } from "./TimeTrackingProvider";

function formatHHMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")} : ${String(minutes).padStart(2, "0")} : ${String(seconds).padStart(2, "0")}`;
}

type Status = "working" | "on-break" | "clocked-out";

export default function HeroSessionCard() {
  const { active, ongoingBreak, workedMs, currentBreakMs } = useTimeTracking();

  const displayMs = ongoingBreak ? currentBreakMs : workedMs;
  const status: Status = active ? (ongoingBreak ? "on-break" : "working") : "clocked-out";

  const statusConfig = {
    working: {
      label: "Working",
      pulseClass: "animate-glow-green",
      badgeBg: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
      gradient: "from-emerald-500/10 via-slate-900/80 to-cyan-500/10"
    },
    "on-break": {
      label: "On Break",
      pulseClass: "animate-glow-amber",
      badgeBg: "bg-amber-500/20 border-amber-500/50 text-amber-400",
      gradient: "from-amber-500/10 via-slate-900/80 to-orange-500/10"
    },
    "clocked-out": {
      label: "Clocked Out",
      pulseClass: "",
      badgeBg: "bg-slate-500/20 border-slate-500/50 text-slate-400",
      gradient: "from-slate-500/10 via-slate-900/80 to-slate-600/10"
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${config.gradient} p-8 backdrop-blur-xl shadow-2xl ${
        status !== "clocked-out" ? config.pulseClass : ""
      }`}
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center">
        <span
          className={`mb-4 inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${config.badgeBg}`}
        >
          {config.label}
        </span>
        <p className="font-mono text-6xl font-bold tabular-nums text-white md:text-7xl">
          {formatHHMMSS(displayMs)}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {ongoingBreak ? "Break Duration" : "Work Time"}
        </p>
      </div>
    </div>
  );
}
