"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Filter, RotateCcw } from "lucide-react";

type Props = {
  initialRange?: string;
  initialStart?: string;
  initialEnd?: string;
};

export default function DashboardDateFilter({
  initialRange = "today",
  initialStart = "",
  initialEnd = ""
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [range, setRange] = useState(initialRange);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);

  const isCustom = range === "custom";
  const canApply = !isCustom || (start && end);
  const canClear = initialRange !== "today" || !!initialStart || !!initialEnd || range !== "today" || !!start || !!end;

  const hasPendingChanges = useMemo(() => {
    return range !== initialRange || start !== initialStart || end !== initialEnd;
  }, [end, initialEnd, initialRange, initialStart, range, start]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);

    if (isCustom && start && end) {
      params.set("start", start);
      params.set("end", end);
    } else {
      params.delete("start");
      params.delete("end");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setRange("today");
    setStart("");
    setEnd("");
    router.push(pathname);
  };

  return (
    <div className="rounded-3xl border border-border-color bg-card-bg/80 p-4 shadow-lg shadow-black/10 backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Dashboard Filter</p>
          <p className="text-sm text-text-secondary">
            Pick a time range and apply it to refresh task activity and work-time summaries.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[220px_auto_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Date Range</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <select
                value={range}
                onChange={(event) => setRange(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border-color bg-bg-secondary pl-10 pr-4 text-sm text-text-primary outline-none transition focus:border-cyan-400"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="60d">Last 60 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </label>

          {isCustom && (
            <>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Start Date</span>
                <input
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border-color bg-bg-secondary px-4 text-sm text-text-primary outline-none transition focus:border-cyan-400"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">End Date</span>
                <input
                  type="date"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-border-color bg-bg-secondary px-4 text-sm text-text-primary outline-none transition focus:border-cyan-400"
                />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={applyFilters}
            disabled={!canApply || !hasPendingChanges}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Filter className="h-4 w-4" />
            Apply Filter
          </button>
          <button
            type="button"
            onClick={clearFilters}
            disabled={!canClear}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border-color bg-bg-secondary px-4 text-sm font-semibold text-text-secondary transition hover:border-border-color/80 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
