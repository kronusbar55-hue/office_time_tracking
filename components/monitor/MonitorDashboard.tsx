"use client";

import React, { useEffect, useState } from "react";
import { Search, Grid, List, RefreshCcw, Monitor, Activity, MousePointer2, Move, Type, Clock, Globe } from "lucide-react";
import EmployeeActivityCard from "./EmployeeActivityCard";

export default function MonitorDashboard() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    const fetchMonitorData = async () => {
        try {
            const res = await fetch("/api/monitor");
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch monitor data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMonitorData();
        const interval = setInterval(fetchMonitorData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

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

                <div className="flex items-center gap-3">
                    <div className="relative">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-[400px] rounded-2xl bg-white/5 animate-pulse border border-white/5" />
                    ))}
                </div>
            ) : (
                <div className={viewMode === "grid"
                    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    : "space-y-4"
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
        </div>
    );
}
