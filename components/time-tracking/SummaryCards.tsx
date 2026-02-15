"use client";

interface SummaryCardsProps {
  workedMs: number;
  breakMs: number;
  remainingMs?: number;
  shiftHoursTarget?: number;
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatHHMMSS(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")} : ${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
}

export default function SummaryCards({
  workedMs,
  breakMs,
  remainingMs = 0,
  shiftHoursTarget = 8
}: SummaryCardsProps) {
  const workedHours = workedMs / 3600000;
  const breakHours = breakMs / 3600000;
  const overtimeHours = Math.max(0, workedHours - shiftHoursTarget);
  const showRemaining = remainingMs > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-slate-600">WORKED</span>
        </div>
        <p className="text-3xl font-bold font-mono text-slate-900">{formatHHMMSS(workedMs)}</p>
        <p className="text-xs text-slate-500 mt-2">{formatDuration(workedMs)} ({workedHours.toFixed(2)}h total)</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="text-xs font-semibold text-slate-600">BREAKS</span>
        </div>
        <p className="text-3xl font-bold font-mono text-slate-900">{formatHHMMSS(breakMs)}</p>
        <p className="text-xs text-slate-500 mt-2">{formatDuration(breakMs)} ({breakHours.toFixed(2)}h total)</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-xs font-semibold text-slate-600">OVERTIME</span>
        </div>
        <p className="text-3xl font-bold text-slate-900">{overtimeHours.toFixed(2)}h</p>
        <p className="text-xs text-slate-500 mt-2">Over {shiftHoursTarget}h target</p>
      </div>

      {/* {showRemaining && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-3 w-3 rounded-full bg-cyan-500" />
            <span className="text-xs font-semibold text-slate-600">REMAINING</span>
          </div>
          <p className="text-3xl font-bold font-mono text-cyan-600">{formatHHMMSS(remainingMs)}</p>
          <p className="text-xs text-slate-500 mt-2">Until {shiftHoursTarget}h shift</p>
        </div>
      )} */}
    </div>
  );
}
