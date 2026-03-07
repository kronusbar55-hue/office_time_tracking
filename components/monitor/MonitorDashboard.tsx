"use client";

import React, { useEffect, useState } from "react";
import { Search, Grid, List, RefreshCcw, Monitor, Activity, MousePointer2, Move, Type, Clock, Globe } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import EmployeeActivityCard from "./EmployeeActivityCard";

export default function MonitorDashboard() {
    const { user } = useAuth();
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

    const isRestricted = user?.role !== "admin" && user?.role !== "hr";

    useEffect(() => {
        if (isRestricted && user?.id) {
            setSelectedUserId(user.id);
            // Fetch current user info for the header
            fetch(`/api/users/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAllUsers([data.data]);
                    }
                })
                .catch(console.error);
            return;
        }

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
    }, [user, isRestricted]);

    const fetchMonitorData = async () => {
        if (!selectedUserId || selectedUserId === "all") {
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
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between bg-slate-900/40 p-8 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-accent/10 rounded-2xl border border-accent/20">
                            <Monitor className="h-8 w-8 text-accent" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight">
                                Monitor <span className="text-accent underline decoration-accent/30 underline-offset-8">Center</span>
                            </h1>
                            <p className="text-slate-400 text-sm mt-1 font-medium">Capture insights, enhance productivity.</p>
                        </div>
                    </div>

                    {selectedUserData && (
                        <div className="mt-6 flex items-center gap-4 animate-in slide-in-from-left duration-500">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent to-accent/60 p-0.5 shadow-lg">
                                <div className="h-full w-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden">
                                    {selectedUserData.avatarUrl ? (
                                        <img src={selectedUserData.avatarUrl} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-accent uppercase">
                                            {selectedUserData.firstName?.charAt(0)}{selectedUserData.lastName?.charAt(0)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white leading-none">
                                    {selectedUserData.firstName} {selectedUserData.lastName}
                                </h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-widest">
                                        Selected Employee
                                    </span>
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                        ID: {selectedUserData._id || selectedUserData.id}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-4 relative z-10">
                    {/* Controls Group */}
                    <div className="flex items-center gap-3 bg-slate-950/40 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
                        {/* User Dropdown */}
                        {!isRestricted && (
                            <div className="relative">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="bg-slate-900/60 border border-white/10 rounded-xl px-5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none min-w-[200px] transition-all cursor-pointer hover:bg-slate-800"
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
                                className="bg-slate-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all cursor-pointer hover:bg-slate-800 [color-scheme:dark]"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>

                        <div className="h-8 w-[1px] bg-white/5 mx-1" />

                        <div className="flex items-center bg-slate-900/40 border border-white/10 rounded-xl p-1">
                            <button
                                onClick={() => setViewMode("grid")}
                                title="Grid View"
                                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent text-slate-950 shadow-lg shadow-accent/20" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                <Grid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                title="List View"
                                className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-accent text-slate-950 shadow-lg shadow-accent/20" : "text-slate-500 hover:text-slate-300"}`}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>

                        <button
                            onClick={fetchMonitorData}
                            className="p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-slate-400 hover:bg-slate-800 hover:text-white transition-all shadow-inner"
                        >
                            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>

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
                                {selectedUserId === "all" || !selectedUserId
                                    ? "Please select an employee from the dropdown to view their monitoring activity."
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
