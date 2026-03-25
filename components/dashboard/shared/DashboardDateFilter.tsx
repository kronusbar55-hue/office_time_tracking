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
    <div className="flex flex-wrap items-center gap-4 py-2">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-text-secondary" />
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="h-10 rounded-lg border border-border-color bg-bg-secondary px-3 text-sm text-text-primary outline-none transition focus:border-accent/60"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">Last 7 Days</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>

      {isCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-10 rounded-lg border border-border-color bg-bg-secondary px-3 text-sm text-text-primary outline-none transition focus:border-accent/60"
          />
          <span className="text-text-secondary">to</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-10 rounded-lg border border-border-color bg-bg-secondary px-3 text-sm text-text-primary outline-none transition focus:border-accent/60"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={applyFilters}
          disabled={!canApply || !hasPendingChanges}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Filter className="h-4 w-4" />
          Apply
        </button>
        {canClear && (
          <button
            onClick={clearFilters}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-color bg-bg-secondary px-4 text-sm font-semibold text-text-primary transition hover:border-accent/60"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
