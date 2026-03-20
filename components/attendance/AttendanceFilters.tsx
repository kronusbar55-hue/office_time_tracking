"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Search, Download } from "lucide-react";

interface AttendanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  technologies: { id: string; name: string }[];
  techsLoading?: boolean;
  selectedTechnology: string;
  onTechnologyChange: (techId: string) => void;
  onExport: () => void;
  viewMode: "list" | "calendar";
  onViewModeChange: (mode: "list" | "calendar") => void;
}

export function AttendanceFilters({
  searchQuery,
  onSearchChange,
  selectedDate,
  onDateChange,
  technologies,
  techsLoading,
  selectedTechnology,
  onTechnologyChange,
  onExport,
  viewMode,
  onViewModeChange
}: AttendanceFiltersProps) {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search and Date Row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search employee by name or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-border-color bg-bg-secondary/50 py-2 pl-10 pr-4 text-sm text-text-primary placeholder-slate-500 transition-colors focus:border-border-color focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="rounded-lg border border-border-color bg-bg-secondary/50 px-3 py-2 text-sm text-text-primary transition-colors focus:border-border-color focus:outline-none focus:ring-1 focus:ring-slate-500"
          />

          {techsLoading ? (
            <div className="h-9 w-48 rounded-lg border border-border-color bg-bg-secondary/50 animate-pulse" />
          ) : (
            <select
              value={selectedTechnology}
              onChange={(e) => onTechnologyChange(e.target.value)}
              className="rounded-lg border border-border-color bg-bg-secondary/50 px-3 py-2 text-sm text-text-primary transition-colors focus:border-border-color focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="all">All Technologies</option>
              {technologies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {/* <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="rounded-lg border border-border-color bg-bg-secondary/50 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-card-bg hover:text-text-primary"
          >
            More Filters
          </button> */}

          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-lg border border-border-color bg-bg-secondary/50 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-card-bg hover:text-text-primary"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">

        </div>
      </div>
    </div>
  );
}
