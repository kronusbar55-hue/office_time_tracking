"use client";

import React, { useEffect, useState } from "react";
import { Search, Grid, List, RefreshCcw, Monitor, Activity, MousePointer2, Move, Type, Clock, Globe, BarChart3 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import EmployeeActivityCard from "./EmployeeActivityCard";
import MonitorTimeline from "./MonitorTimeline";
import { AnimatePresence } from "framer-motion";

export default function MonitorDashboard() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showTimeline, setShowTimeline] = useState(false);

    // New filter states
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("all");
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Pagination states
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalActiveRecords, setTotalActiveRecords] = useState(0);

    const isRestricted = user?.role !== "admin" && user?.role !== "hr";

    useEffect(() => {
        if (isRestricted && user?.id) {
            setSelectedUserId(user.id);
            // Fetch current user info for the header
            fetch(`/api/users/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    const userData = data.success ? data.data : (data.user || data);
                    if (userData) {
                        setAllUsers([userData]);
                    }
                })
                .catch(console.error);
        } else if (!isRestricted) {
            // Fetch all users for the dropdown filter (only for admin/hr)
            fetch("/api/users")
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAllUsers(data.data);
                    } else if (Array.isArray(data)) {
                        setAllUsers(data);
                    }
                })
                .catch(console.error);
        }
    }, [user?.id, user?.role, isRestricted]);

    const fetchMonitorData = async () => {
        if (!selectedUserId || selectedUserId === "all" || !selectedDate) {
            setEmployees([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (selectedDate) params.append("date", selectedDate);
            params.append("userId", selectedUserId);
            params.append("page", page.toString());
            params.append("limit", "15");

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

    const selectedUserData = allUsers.find(u => (u._id || u.id) === selectedUserId);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between bg-slate-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
                            <Monitor className="h-7 w-7 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                                Monitor <span className="text-accent">Center</span>
                            </h1>
                            <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-[0.3em]">Insights & Activity Tracking</p>
                        </div>
                    </div>

                    {selectedUserData && (
                        <div className="mt-6 flex items-center gap-4 animate-in slide-in-from-left duration-500 bg-black/20 p-3 rounded-xl border border-white/5">
                            <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center overflow-hidden shadow-lg">
                                {selectedUserData.avatarUrl ? (
                                    <img src={selectedUserData.avatarUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-lg font-black text-slate-950 uppercase">
                                        {selectedUserData.firstName?.charAt(0)}{selectedUserData.lastName?.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white tracking-tight leading-none uppercase">
                                    {selectedUserData.firstName} {selectedUserData.lastName}
                                </h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-[8px] font-black text-accent uppercase tracking-widest">
                                        Employee ID: {selectedUserData._id || selectedUserData.id}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3 relative z-10">
                    {/* Controls Group */}
                    <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
                        {/* User Dropdown */}
                        {!isRestricted && (
                            <div className="relative">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="bg-slate-900/80 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-accent/50 appearance-none min-w-[180px] transition-all cursor-pointer hover:bg-slate-800 uppercase tracking-widest"
                                >
                                    <option value="all">Select Employee</option>
                                    {allUsers.map((u: any) => (
                                        <option key={u._id || u.id} value={u._id || u.id}>
                                            {u.firstName} {u.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date Picker */}
                        <div className="relative">
                            <input
                                type="date"
                                disabled={!selectedUserId || selectedUserId === "all"}
                                title={(!selectedUserId || selectedUserId === "all") ? "Please select an employee first" : "Select date"}
                                className={`bg-slate-900/80 border border-white/10 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all cursor-pointer hover:bg-slate-800 [color-scheme:dark] ${(!selectedUserId || selectedUserId === "all") ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>

                        <div className="h-6 w-[1px] bg-white/10 mx-1" />

                        <div className="flex items-center bg-slate-900/60 border border-white/10 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode("grid")}
                                title="Grid View"
                                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-accent text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                <Grid className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                title="List View"
                                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-accent text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                <List className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowTimeline(!showTimeline)}
                            disabled={!selectedUserId || selectedUserId === "all" || !selectedDate}
                            className={`p-2 rounded-lg border transition-all flex items-center gap-2 ${showTimeline ? 'bg-accent text-slate-950 border-accent shadow-lg shadow-accent/20' : 'bg-slate-900/80 border-white/10 text-slate-400 hover:bg-accent hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed grayscale'}`}
                            title="Visual Activity Timeline"
                        >
                            <Activity className={`h-3.5 w-3.5 ${showTimeline ? 'animate-pulse' : ''}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest px-1">Timeline</span>
                        </button>

                        <button
                            onClick={fetchMonitorData}
                            className="p-2 rounded-lg bg-slate-900/80 border border-white/10 text-slate-400 hover:bg-accent hover:text-slate-950 transition-all font-bold group"
                            title="Refresh Data"
                        >
                            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            <AnimatePresence>
                {showTimeline && selectedUserId !== "all" && selectedDate && (
                    <MonitorTimeline
                        userId={selectedUserId}
                        date={selectedDate}
                        onClose={() => setShowTimeline(false)}
                    />
                )}
            </AnimatePresence>

            {loading && employees.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[4/3] rounded-3xl bg-slate-900/40 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className={viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"
                    : "space-y-4"
                }>
                    {employees.map(emp => (
                        <EmployeeActivityCard
                            key={emp._id}
                            employee={emp}
                            viewMode={viewMode}
                            showName={false}
                        />
                    ))}

                    {employees.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-32 text-slate-500 bg-slate-900/10 rounded-[3rem] border border-dashed border-white/5 backdrop-blur-sm">
                            <div className="h-24 w-24 bg-slate-900/40 rounded-full flex items-center justify-center mb-6 border border-white/5">
                                <Monitor className="h-10 w-10 opacity-10" />
                            </div>
                            <h3 className="text-xl font-bold text-white/50 mb-2">No Data Available</h3>
                            <p className="text-slate-600 max-w-xs text-center text-sm">
                                {(!selectedUserId || selectedUserId === "all")
                                    ? "Please select an employee from the dropdown to Begin."
                                    : !selectedDate
                                        ? "Almost there! Now please select a date to view activity."
                                        : "No activity records found for this employee on the selected date."}
                            </p>
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
