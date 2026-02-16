"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { format } from "date-fns";
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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // Fetch attendance data
  const fetchAttendance = async (suppressLoading = false) => {
    if (!suppressLoading) {
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
      lastFetchTimeRef.current = Date.now();
    } catch (error) {
      console.error("Failed to fetch attendance:", error);
    } finally {
      if (!suppressLoading) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  };

  // Initial fetch and filter change fetch
  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedTechnology, searchQuery]);

  // Auto-refresh polling - only for today's data
  useEffect(() => {
    const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
    
    if (isToday) {
      // Initial fetch is already done above
      
      // Set up polling interval (every 5 seconds)
      pollingIntervalRef.current = setInterval(() => {
        fetchAttendance(true); // suppress loading indicator
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    } else {
      // Stop polling for non-today dates
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [selectedDate]);

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
            Calendar and daily attendance status generated from time entries. Auto-refreshes every 5 seconds for today.
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
        onExport={handleExport}
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
      {viewMode === "calendar" && (
        <div className="rounded-xl border border-slate-800 bg-card/70 p-12 text-center">
          <p className="text-slate-400">Calendar view coming soon</p>
        </div>
      )}
    </div>
  );
}

