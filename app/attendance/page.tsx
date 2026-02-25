"use client";

import { useEffect, useState, useMemo } from "react";
import { format, parseISO, addDays } from "date-fns";
import { AttendanceSummaryCards } from "@/components/attendance/AttendanceSummaryCards";
import { AttendanceFilters } from "@/components/attendance/AttendanceFilters";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import type { AttendanceRecord } from "@/app/api/attendance/route";

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [selectedTechnology, setSelectedTechnology] = useState("all");
  const [technologies, setTechnologies] = useState<{ id: string; name: string }[]>([]);
  const [techsLoading, setTechsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<AttendanceRecord["status"] | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    checkedIn: 0,
    checkedOut: 0,
    onBreak: 0,
    notCheckedIn: 0
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStart, setExportStart] = useState<string>(selectedDate);
  const [exportEnd, setExportEnd] = useState<string>(selectedDate);

  // Fetch attendance data
  const fetchAttendance = async (manualRefresh = false) => {
    if (!manualRefresh) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const params = new URLSearchParams({
        date: selectedDate,
        technology: selectedTechnology,
        search: searchQuery
      });

      const response = await fetch(`/api/attendance?${params}`, {
        cache: 'no-store'
      });
      const data = await response.json();

      setRecords(data.data || []);
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      if (!manualRefresh) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  // Fetch on initial load and when filters change
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedTechnology, searchQuery]);

  // Open export modal (initialize dates)
  const openExportModal = () => {
    setExportStart(selectedDate);
    setExportEnd(selectedDate);
    setShowExportModal(true);
  };

  const closeExportModal = () => setShowExportModal(false);

  // Export for selected date range (inclusive)
  const confirmExportRange = async () => {
    try {
      setIsRefreshing(true);
      const start = parseISO(exportStart);
      const end = parseISO(exportEnd);
      if (start > end) {
        alert("Start date must be before or equal to end date");
        return;
      }

      const aggregated: any[] = [];
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, "yyyy-MM-dd");
        const params = new URLSearchParams({
          date: dateStr,
          technology: selectedTechnology,
          search: searchQuery
        });
        if (activeFilter && activeFilter !== "all") params.set("status", activeFilter);

        const res = await fetch(`/api/attendance?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        (data.data || []).forEach((r: any) => aggregated.push({ ...r, exportDate: dateStr }));
      }

      if (aggregated.length === 0) {
        alert("No records to export for the selected range");
        return;
      }

      const headers = [
        "Employee",
        "Email",
        "Role",
        "Technology",
        "Date",
        "Check-In",
        "Check-Out",
        "Working Hours",
        "Status",
        "Notes"
      ];

      const rows = aggregated.map((r) => [
        `${r.firstName} ${r.lastName}`,
        r.email,
        r.role,
        r.technology?.name || "N/A",
        r.exportDate,
        r.checkIn ? new Date(r.checkIn).toISOString() : "—",
        r.checkOut ? new Date(r.checkOut).toISOString() : "—",
        `${r.workingHours}h`,
        r.status,
        r.notes || "—"
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => (typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell))
            .join(",")
        )
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${exportStart}_to_${exportEnd}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      alert("Failed to export data");
    } finally {
      setIsRefreshing(false);
    }
  };

  async function loadTechnologies() {
    setTechsLoading(true);
    try {
      const res = await fetch("/api/technologies");
      if (!res.ok) throw new Error("Failed to load technologies");
      const data = await res.json();
      setTechnologies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTechsLoading(false);
    }
  }

  useEffect(() => {
    void loadTechnologies();
  }, []);

  // Filter records based on active filter
  const filteredRecords = useMemo(() => {
    if (activeFilter === "all") {
      return records;
    }
    return records.filter((r) => r.status === activeFilter);
  }, [records, activeFilter]);

  // Handle export
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      alert("No records to export");
      return;
    }

    const headers = [
      "Employee",
      "Email",
      "Role",
      "Technology",
      "Check-In",
      "Check-Out",
      "Working Hours",
      "Status",
      "Notes"
    ];

    const rows = filteredRecords.map((r) => [
      `${r.firstName} ${r.lastName}`,
      r.email,
      r.role,
      r.technology?.name || "N/A",
      r.checkIn ? format(new Date(r.checkIn), "HH:mm") : "—",
      r.checkOut ? format(new Date(r.checkOut), "HH:mm") : "—",
      `${r.workingHours}h`,
      r.status,
      r.notes || "—"
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell}"`
              : cell
          )
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Attendance</h1>
          <p className="mt-1 text-sm text-slate-400">
            Calendar and daily attendance status generated from time entries.
          </p>
        </div>
        <button
          onClick={() => fetchAttendance(true)}
          disabled={isRefreshing}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh Now"}
        </button>
      </div>

      {/* Export modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeExportModal} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-100">Export attendance (date range)</h3>
            <div className="flex flex-col gap-3">
              <label className="text-sm text-slate-300">Start date</label>
              <input
                type="date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
                className="rounded-md bg-slate-800 p-2 text-slate-100"
              />
              <label className="text-sm text-slate-300">End date</label>
              <input
                type="date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
                className="rounded-md bg-slate-800 p-2 text-slate-100"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeExportModal} className="rounded-md bg-slate-700 px-3 py-2 text-sm text-slate-200">Cancel</button>
              <button onClick={confirmExportRange} className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white">Export</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <AttendanceSummaryCards
        summary={summary}
        activeFilter={activeFilter}
        onFilterChange={(filter) => {
          setActiveFilter(filter);
          setCurrentPage(1);
        }}
      />

      {/* Filters */}
      <AttendanceFilters
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setCurrentPage(1);
        }}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        technologies={technologies}
        techsLoading={techsLoading}
        selectedTechnology={selectedTechnology}
        onTechnologyChange={(dept) => {
          setSelectedTechnology(dept);
          setCurrentPage(1);
        }}
        onExport={openExportModal}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Table */}
      {viewMode === "list" && (
        <AttendanceTable
          records={filteredRecords}
          isLoading={isLoading}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Calendar Placeholder */}
      {/* {viewMode === "calendar" && (
        <div className="rounded-xl border border-slate-800 bg-card/70 p-12 text-center">
          <p className="text-slate-400">Calendar view coming soon</p>
        </div>
      )} */}
    </div>
  );
}

