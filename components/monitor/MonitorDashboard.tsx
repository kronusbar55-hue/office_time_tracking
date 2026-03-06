"use client";

import React, { useEffect, useState } from "react";
import { Search, Grid, List, RefreshCcw, Monitor, Activity, MousePointer2, Move, Type, Clock, Globe } from "lucide-react";
import EmployeeActivityCard from "./EmployeeActivityCard";

export default function MonitorDashboard() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // New filter states
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("all");
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Pagination states
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalActiveRecords, setTotalActiveRecords] = useState(0);

    useEffect(() => {
        // Fetch all users for the dropdown filter
        fetch("/api/users")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setAllUsers(data.data);
                } else if (Array.isArray(data)) {
                    // Some APIs return raw array
                    setAllUsers(data);
                }
            })
            .catch(console.error);
    }, []);

    const fetchMonitorData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedDate) params.append("date", selectedDate);
            if (selectedUserId && selectedUserId !== "all") params.append("userId", selectedUserId);
            params.append("page", page.toString());
            params.append("limit", "12");

            const res = await fetch(`/api/monitor?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data);
                if (data.pagination) {
                    setTotalPages(data.pagination.totalPages);
                    setTotalActiveRecords(data.pagination.totalActiveRecords);
                }
            }
        } catch (error) {
            console.error("Failed to fetch monitor data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1); // Reset to page 1 when filters change
    }, [selectedDate, selectedUserId]);

    useEffect(() => {
        fetchMonitorData();
    }, [selectedDate, selectedUserId, page]); // Refetch when filters or page change

    useEffect(() => {
        const interval = setInterval(fetchMonitorData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [selectedDate, selectedUserId, page]);

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Monitor className="h-8 w-8 text-accent" />
                        Employee Monitor
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Real-time activity tracking for your team</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* User Dropdown */}
                    <div className="relative">
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none min-w-[150px] transition-all"
                        >
                            <option value="all">Select Employees</option>
                            {allUsers.map((u: any) => (
                                <option key={u._id || u.id} value={u._id || u.id}>
                                    {u.firstName} {u.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div className="relative">
                        <input
                            type="date"
                            className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all [color-scheme:dark]"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>

                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            className="bg-slate-950/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 w-64 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center bg-slate-950/50 border border-white/10 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}
                        >
                            <Grid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={fetchMonitorData}
                        className="p-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                    >
                        <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {loading && employees.length === 0 ? (
                <div className="grid grid-cols-2 shadow-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {[...Array(16)].map((_, i) => (
                        <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className={viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-5 gap-4"
                    : "space-y-3"
                }>
                    {filteredEmployees.map(emp => (
                        <EmployeeActivityCard
                            key={emp._id}
                            employee={emp}
                            viewMode={viewMode}
                        />
                    ))}

                    {filteredEmployees.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-white/10">
                            <Monitor className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">No employees found matching your search</p>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-sm mt-6">
                    <div className="text-sm text-slate-400">
                        Showing page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span>
                        <span className="ml-2 text-slate-500">({totalActiveRecords} total records)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
