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
    // List of users for the sidebar
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userPage, setUserPage] = useState(1);
    const [totalUserPages, setTotalUserPages] = useState(1);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Filter states
    const [selectedUserId, setSelectedUserId] = useState("all");
    const [selectedDate, setSelectedDate] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showTimeline, setShowTimeline] = useState(false);

    // Pagination states for activity
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalActiveRecords, setTotalActiveRecords] = useState(0);



    const isRestricted = user?.role !== "admin" && user?.role !== "hr";

    const fetchUsers = async () => {
        if (isRestricted) {
            if (user?.id) {
                setSelectedUserId(user.id);
                try {
                    const res = await fetch(`/api/users/${user.id}`);
                    const data = await res.json();
                    const userData = data.success ? data.data : (data.user || data);
                    if (userData) setAllUsers([userData]);
                } catch (e) { console.error(e); }
            }
            return;
        }

        try {
            const params = new URLSearchParams({
                paginate: "true",
                page: userPage.toString(),
                limit: "5",
                search: userSearchQuery
            });
            const res = await fetch(`/api/users?${params.toString()}`);
            const data = await res.json();
            if (data.users) {
                setAllUsers(data.users);
                setTotalUserPages(data.pagination.totalPages);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchUsers();
    }, [user?.id, user?.role, isRestricted, userPage, userSearchQuery]);


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
            params.append("limit", "5");


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
        // Automatically select today's date if not set
        if (!selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, []);

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
        <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in duration-700 min-h-[600px]">
            {/* Sidebar: Employee Selection */}
            {!isRestricted && (
                <div className="w-full lg:w-72 shrink-0 space-y-4">
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-xl flex flex-col h-full">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-accent/10 rounded-lg border border-accent/20">
                                <Activity className="h-5 w-5 text-accent" />
                            </div>
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">Employees</h2>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={userSearchQuery}
                                onChange={(e) => {
                                    setUserSearchQuery(e.target.value);
                                    setUserPage(1);
                                }}
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
                            />
                        </div>

                        {/* Employee List */}
                        <div className="space-y-2 flex-1 overflow-y-auto">
                            {allUsers.length === 0 ? (
                                <div className="py-10 text-center text-slate-600 text-xs italic">No employees found</div>
                            ) : (
                                allUsers.map((u: any) => {
                                    const isSelected = selectedUserId === u.id;
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => {
                                                setSelectedUserId(u.id);
                                                // Default to today if no date selected
                                                if (!selectedDate) {
                                                    const today = new Date().toISOString().split('T')[0];
                                                    setSelectedDate(today);
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300 text-left group ${isSelected
                                                ? "bg-accent border-accent text-slate-950 shadow-lg shadow-accent/20 scale-[1.02]"
                                                : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:border-white/10"
                                                }`}
                                        >
                                            <div className={`h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center font-black text-xs shrink-0 ${isSelected ? "bg-slate-950 text-accent ring-2 ring-slate-950/20" : "bg-slate-800 text-slate-400"}`}>
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-[11px] font-black truncate uppercase tracking-tight ${isSelected ? "text-slate-950" : "text-white"}`}>
                                                    {u.firstName} {u.lastName}
                                                </p>
                                                <p className={`text-[9px] font-bold truncate ${isSelected ? "text-slate-900/60" : "text-slate-500"}`}>
                                                    {u.role}
                                                </p>
                                            </div>
                                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-pulse" />}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Employee Pagination */}
                        {totalUserPages > 1 && (
                            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                                <button
                                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                    disabled={userPage === 1}
                                    className="p-1.5 rounded-lg border border-white/10 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                >
                                    <Move className="h-3.5 w-3.5 rotate-180" />
                                </button>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{userPage} / {totalUserPages}</span>
                                <button
                                    onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                                    disabled={userPage === totalUserPages}
                                    className="p-1.5 rounded-lg border border-white/10 text-slate-500 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                                >
                                    <Move className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                {/* Header Filter Bar */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between relative z-10">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
                                    <Monitor className="h-7 w-7 text-accent" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
                                        Monitor <span className="text-accent">Center</span>
                                    </h1>
                                    <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-[0.3em]">Activity Insight Dashboard</p>
                                </div>
                            </div>

                            {selectedUserData && (
                                <div className="mt-4 inline-flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-xl border border-white/5 animate-in slide-in-from-left duration-300">
                                    <div className="h-6 w-6 rounded bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent uppercase">
                                        {selectedUserData.firstName?.[0]}{selectedUserData.lastName?.[0]}
                                    </div>
                                    <span className="text-xs font-black text-white uppercase tracking-wider">{selectedUserData.firstName} {selectedUserData.lastName}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Date Picker */}
                            <div className="relative group">
                                <input
                                    type="date"
                                    disabled={!selectedUserId || selectedUserId === "all"}
                                    title={(!selectedUserId || selectedUserId === "all") ? "Please select an employee first" : "Select date"}
                                    className={`bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all cursor-pointer hover:bg-slate-800 [color-scheme:dark] shadow-inner ${(!selectedUserId || selectedUserId === "all") ? "opacity-30 cursor-not-allowed grayscale" : ""}`}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>

                            <div className="h-6 w-[1px] bg-white/10 mx-1 hidden sm:block" />

                            <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300"}`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-accent text-slate-950 shadow-md" : "text-slate-500 hover:text-slate-300"}`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowTimeline(!showTimeline)}
                                disabled={!selectedUserId || selectedUserId === "all" || !selectedDate}
                                className={`h-10 px-4 rounded-xl border transition-all flex items-center gap-2 group ${showTimeline ? 'bg-accent text-slate-950 border-accent shadow-lg shadow-accent/20' : 'bg-black/40 border-white/10 text-slate-400 hover:bg-accent hover:text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed'}`}
                            >
                                <Activity className={`h-4 w-4 ${showTimeline ? 'animate-pulse' : ''}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Timeline</span>
                            </button>

                            <button
                                onClick={fetchMonitorData}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 text-slate-400 hover:bg-accent hover:text-slate-950 transition-all group shadow-inner"
                            >
                                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timeline Popover */}
                <AnimatePresence>
                    {showTimeline && selectedUserId !== "all" && selectedDate && (
                        <div className="animate-in slide-in-from-top duration-500">
                            <MonitorTimeline
                                userId={selectedUserId}
                                date={selectedDate}
                                onClose={() => setShowTimeline(false)}
                            />
                        </div>
                    )}
                </AnimatePresence>

                {/* Activity Grid/List */}
                {loading && employees.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="aspect-video rounded-3xl bg-slate-900/40 animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : (
                    <div className={viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
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
                                <h3 className="text-xl font-bold text-white/50 mb-2">No Records Found</h3>
                                <p className="text-slate-600 max-w-xs text-center text-sm">
                                    {(!selectedUserId || selectedUserId === "all")
                                        ? "Select an employee from the sidebar to view their activity log."
                                        : !selectedDate
                                            ? "Select a date to retrieve specific session captures."
                                            : "We couldn't find any activity records for this date. Check another day."}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between bg-black/40 p-5 rounded-2xl border border-white/5 backdrop-blur-sm shadow-xl">
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                            Page <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span>
                            <span className="ml-3 text-accent opacity-60">Results: {totalActiveRecords}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="h-9 px-4 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:bg-accent hover:text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-black uppercase tracking-widest"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="h-9 px-4 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:bg-accent hover:text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-black uppercase tracking-widest"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

}
