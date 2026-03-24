"use client";

import React, { useEffect, useState } from "react";
import { Search, Grid, List, RefreshCcw, Monitor, Activity, MousePointer2, Move, Type, Clock, Globe, BarChart3 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import EmployeeActivityCard from "./EmployeeActivityCard";
import MonitorTimeline from "./MonitorTimeline";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";

export default function MonitorDashboard() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // List of users for the sidebar
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userPage, setUserPage] = useState(1);
    const [totalUserPages, setTotalUserPages] = useState(1);
    const [allUsers, setAllUsers] = useState<any[]>([]);

    // Filter states
    const [selectedUserId, setSelectedUserId] = useState(() => searchParams.get("userId") || "all");
    const [selectedDate, setSelectedDate] = useState(() => searchParams.get("date") || "");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showTimeline, setShowTimeline] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Pagination states for activity
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalActiveRecords, setTotalActiveRecords] = useState(0);
    const [monitorSummary, setMonitorSummary] = useState<any>(null);



    const isRestricted = user?.role !== "admin";

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
            params.append("limit", "20");


            const res = await fetch(`/api/monitor?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data);
                if (data.summary) {
                    setMonitorSummary(data.summary);
                } else {
                    setMonitorSummary(null);
                }
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
        // Automatically select today's date if not set and no query param was provided
        if (!selectedDate && !searchParams.get("date")) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, [searchParams]);

    useEffect(() => {
        // Automatically update filters if URL changes
        const uId = searchParams.get("userId");
        const dStr = searchParams.get("date");
        if (uId && uId !== selectedUserId) setSelectedUserId(uId);
        if (dStr && dStr !== selectedDate) setSelectedDate(dStr);
    }, [searchParams]);

    useEffect(() => {
        setPage(1); // Reset to page 1 when filters change
        
        // Sync URL parameters
        const params = new URLSearchParams(searchParams.toString());
        if (selectedUserId && selectedUserId !== "all") params.set("userId", selectedUserId);
        else params.delete("userId");
        if (selectedDate) params.set("date", selectedDate);
        else params.delete("date");
        
        router.replace(`?${params.toString()}`, { scroll: false });
    }, [selectedDate, selectedUserId]);


    useEffect(() => {
        fetchMonitorData();
    }, [selectedDate, selectedUserId, page]); // Refetch when filters or page change

    useEffect(() => {
        const interval = setInterval(fetchMonitorData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [selectedDate, selectedUserId, page]);

    const selectedUserData = allUsers.find(u => (u._id || u.id) === selectedUserId);

    const getSummaryBorder = (avgDuration: number) => {
        if (avgDuration < 0.1) return "border-2 border-red-500 bg-red-500/10";
        if (avgDuration < 0.4) return "border-2 border-yellow-500 bg-yellow-500/10";
        return "border-2 border-green-500 bg-green-500/10";
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-700 min-h-[600px]">

            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
                {/* Header Filter Bar */}
                <div className="bg-bg-secondary/60 p-6 rounded-2xl border border-border-color backdrop-blur-md shadow-2xl relative z-50">
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -mr-32 -mt-32" />
                    </div>

                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between relative z-10">
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
                                    <Monitor className="h-7 w-7 text-accent" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-text-primary tracking-tighter uppercase">
                                        Monitor <span className="text-accent">Center</span>
                                    </h1>
                                    <p className="text-text-secondary text-[10px] mt-1 font-bold uppercase tracking-[0.3em]">Activity Insight Dashboard</p>
                                </div>
                            </div>

                            {selectedUserData && (
                                <div className="mt-4 inline-flex items-center gap-3 bg-black/20 px-3 py-1.5 rounded-xl border border-border-color animate-in slide-in-from-left duration-300">
                                    <div className="h-6 w-6 rounded bg-accent/20 flex items-center justify-center text-[10px] font-black text-accent uppercase">
                                        {selectedUserData.firstName?.[0]}{selectedUserData.lastName?.[0]}
                                    </div>
                                    <span className="text-xs font-black text-text-primary uppercase tracking-wider">{selectedUserData.firstName} {selectedUserData.lastName}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Employee Dropdown */}
                            {!isRestricted && (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center gap-2 bg-black/40 border border-border-color rounded-xl px-4 py-2 text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all cursor-pointer hover:bg-card-bg shadow-inner min-w-[220px] justify-between"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            {selectedUserId !== "all" && selectedUserData && (
                                                <div className="h-5 w-5 rounded bg-accent/20 flex items-center justify-center text-[8px] font-black text-accent uppercase shrink-0">
                                                    {selectedUserData.avatarUrl ? <img src={selectedUserData.avatarUrl} alt="" className="h-full w-full object-cover rounded" /> : `${selectedUserData.firstName?.[0] || ""}${selectedUserData.lastName?.[0] || ""}`}
                                                </div>
                                            )}
                                            <span className="truncate">
                                                {selectedUserId === "all" ? "Select Employee..." : selectedUserData ? `${selectedUserData.firstName} ${selectedUserData.lastName}` : "Select Employee..."}
                                            </span>
                                        </div>
                                        <Search className="h-3 w-3 text-text-secondary shrink-0" />
                                    </button>

                                    <AnimatePresence>
                                        {isDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="absolute top-full right-0 md:left-0 md:right-auto mt-2 w-72 bg-bg-secondary border border-border-color rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl"
                                                onMouseLeave={() => setIsDropdownOpen(false)}
                                            >
                                                <div className="p-3 border-b border-border-color bg-black/20">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search employees..."
                                                            value={userSearchQuery}
                                                            onChange={(e) => {
                                                                setUserSearchQuery(e.target.value);
                                                                setUserPage(1);
                                                            }}
                                                            className="w-full bg-black/40 border border-border-color rounded-lg pl-8 pr-3 py-2 text-xs font-bold text-text-primary placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all shadow-inner"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                                    {allUsers.length === 0 ? (
                                                        <div className="py-4 text-center text-text-secondary text-xs italic">No employees found</div>
                                                    ) : (
                                                        allUsers.map((u: any) => (
                                                            <button
                                                                key={u.id}
                                                                onClick={() => {
                                                                    setSelectedUserId(u.id);
                                                                    if (!selectedDate) setSelectedDate(new Date().toISOString().split('T')[0]);
                                                                    setIsDropdownOpen(false);
                                                                }}
                                                                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group ${selectedUserId === u.id ? "bg-accent/20 text-accent" : "hover:bg-hover-bg text-text-secondary"}`}
                                                            >
                                                                <div className={`h-6 w-6 rounded overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold ${selectedUserId === u.id ? "bg-accent/10 border border-accent/20" : "bg-card-bg"}`}>
                                                                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" /> : `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="text-[11px] font-bold truncate">{u.firstName} {u.lastName}</p>
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>

                                                {totalUserPages > 1 && (
                                                    <div className="flex items-center justify-between p-2 border-t border-border-color bg-black/20">
                                                        <button
                                                            onClick={() => setUserPage(p => Math.max(1, p - 1))}
                                                            disabled={userPage === 1}
                                                            className="p-1 rounded bg-card-bg text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <Move className="h-3 w-3 rotate-180" />
                                                        </button>
                                                        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">{userPage} / {totalUserPages}</span>
                                                        <button
                                                            onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                                                            disabled={userPage === totalUserPages}
                                                            className="p-1 rounded bg-card-bg text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                                                        >
                                                            <Move className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Date Picker */}
                            <div className="relative group">
                                <input
                                    type="date"
                                    disabled={!selectedUserId || selectedUserId === "all"}
                                    title={(!selectedUserId || selectedUserId === "all") ? "Please select an employee first" : "Select date"}
                                    className={`bg-black/40 border border-border-color rounded-xl px-4 py-2 text-xs font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50 transition-all cursor-pointer hover:bg-card-bg [color-scheme:dark] shadow-inner ${(!selectedUserId || selectedUserId === "all") ? "opacity-30 cursor-not-allowed grayscale" : ""}`}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>

                            <div className="h-6 w-[1px] bg-hover-bg mx-1 hidden sm:block" />

                            <div className="flex items-center bg-black/40 border border-border-color rounded-xl p-1 shadow-inner">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent text-slate-950 shadow-md" : "text-text-secondary hover:text-text-secondary"}`}
                                >
                                    <Grid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-accent text-slate-950 shadow-md" : "text-text-secondary hover:text-text-secondary"}`}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowTimeline(!showTimeline)}
                                disabled={!selectedUserId || selectedUserId === "all" || !selectedDate}
                                className={`h-10 px-4 rounded-xl border transition-all flex items-center gap-2 group ${showTimeline ? 'bg-accent text-slate-950 border-accent shadow-lg shadow-accent/20' : 'bg-black/40 border-border-color text-text-secondary hover:bg-accent hover:text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed'}`}
                            >
                                <Activity className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Timeline</span>
                            </button>

                            <button
                                onClick={fetchMonitorData}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-black/40 border border-border-color text-text-secondary hover:bg-accent hover:text-slate-950 transition-all group shadow-inner"
                            >
                                <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Monitor Summary */}
                {monitorSummary && (
                    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 rounded-2xl ${getSummaryBorder(monitorSummary.avgDurationHours)}`}>
 
                        <div className="text-xs text-text-secondary">
                            <div className="font-semibold text-text-primary">Avg duration (h)</div>
                            <div className="text-lg font-black">{monitorSummary.avgDurationHours.toFixed(2)}</div>
                        </div>
                        <div className="text-xs text-text-secondary">
                            <div className="font-semibold text-text-primary">Total clicks</div>
                            <div className="text-lg font-black">{monitorSummary.totalClicks}</div>
                        </div>
                        <div className="text-xs text-text-secondary">
                            <div className="font-semibold text-text-primary">Total keypresses</div>
                            <div className="text-lg font-black">{monitorSummary.totalKeyPresses}</div>
                        </div>
                        <div className="text-xs text-text-secondary">
                            <div className="font-semibold text-text-primary">Total movements</div>
                            <div className="text-lg font-black">{monitorSummary.totalMovements}</div>
                        </div>
                    </div>
                )}

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
                            <div key={i} className="aspect-video rounded-3xl bg-bg-secondary/40 animate-pulse border border-border-color" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className={viewMode === "grid"
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
                            : "space-y-4"
                        }>
                            {loading ? (
                                // Skeleton placeholders while loading
                                [...Array(5)].map((_, i) => (
                                    viewMode === "grid" ? (
                                        <div key={i} className="aspect-video rounded-3xl bg-bg-secondary/40 animate-pulse border border-border-color" />
                                    ) : (
                                        <div key={i} className="flex items-center gap-4 p-4 bg-bg-secondary/40 rounded-2xl animate-pulse border border-border-color">
                                            <div className="w-12 h-12 bg-card-bg rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-card-bg rounded w-3/4" />
                                                <div className="h-3 bg-card-bg rounded w-1/2" />
                                            </div>
                                        </div>
                                    )
                                ))
                            ) : (
                                employees.map(emp => (
                                    <EmployeeActivityCard
                                        key={emp._id}
                                        employee={emp}
                                        viewMode={viewMode}
                                        showName={false}
                                    />
                                ))
                            )}
                        </div>

                        {employees.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-32 text-text-secondary bg-bg-secondary/10 rounded-[3rem] border border-dashed border-border-color backdrop-blur-sm">
                                <div className="h-24 w-24 bg-bg-secondary/40 rounded-full flex items-center justify-center mb-6 border border-border-color">
                                    <Monitor className="h-10 w-10 opacity-10" />
                                </div>
                                <h3 className="text-xl font-bold text-text-primary/50 mb-2">No Records Found</h3>
                                <p className="text-slate-600 max-w-xs text-center text-sm">
                                    {(!selectedUserId || selectedUserId === "all")
                                        ? "Select an employee from the sidebar to view their activity log."
                                        : !selectedDate
                                            ? "Select a date to retrieve specific session captures."
                                            : "We couldn't find any activity records for this date. Check another day."}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between bg-black/40 p-5 rounded-2xl border border-border-color backdrop-blur-sm shadow-xl">
                    <div className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em]">
                        Page <span className="text-text-primary">{page}</span> of <span className="text-text-primary">{totalPages}</span>
                        <span className="ml-3 text-accent opacity-60">Results: {totalActiveRecords}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-9 px-4 rounded-xl bg-bg-secondary border border-border-color text-text-secondary hover:bg-accent hover:text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-black uppercase tracking-widest"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="h-9 px-4 rounded-xl bg-bg-secondary border border-border-color text-text-secondary hover:bg-accent hover:text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-black uppercase tracking-widest"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

}
