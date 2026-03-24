"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    MapPin,
    Clock,
    Search,
    User as UserIcon,
    CheckCircle2,
    PauseCircle,
    LogOut,
    RefreshCcw,
    ChevronRight
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { redirect } from "next/navigation";
import DashboardCard from "@/components/dashboard/shared/DashboardCard";

interface Member {
    userId: string;
    name: string;
    email: string;
    avatar?: string;
    status: "IN" | "BREAK" | "OUT" | "MEETING";
    lastActivityAt: string;
    timezone: string;
}

interface Summary {
    total: number;
    in: number;
    break: number;
    meeting: number;
    out: number;
}

export default function LiveAttendancePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ summary: Summary; members: Member[] } | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"ALL" | "IN" | "BREAK" | "MEETING" | "OUT">("ALL");
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // RBAC check
    useEffect(() => {
        if (user && user.role !== "admin") {
            redirect("/");
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/live-attendance");
            const result = await res.json();
            if (result.success) {
                setData(result.data);
                setLastRefreshed(new Date());
            }
        } catch (err) {
            console.error("Failed to fetch live attendance", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    const filteredMembers = useMemo(() => {
        if (!data) return [];
        return data.members.filter(m => {
            const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                m.email.toLowerCase().includes(search.toLowerCase());
            const matchStatus = filter === "ALL" || m.status === filter;
            return matchSearch && matchStatus;
        });
    }, [data, search, filter]);

    const paginatedMembers = useMemo(() => {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        return filteredMembers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filteredMembers, page]);

    const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);

    useEffect(() => {
        setPage(1);
    }, [search, filter]);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-bg-primary">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw className="h-10 w-10 text-blue-500 animate-spin" />
                    <p className="text-text-secondary font-medium">Loading Live Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 min-h-screen bg-bg-primary">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-text-primary mb-2">Live Attendance</h1>
                    <p className="text-text-secondary flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Last refreshed: {lastRefreshed.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-text-primary font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh Now
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    label="Total Members"
                    value={data?.summary.total || 0}
                    icon={<Users className="h-6 w-6" />}
                    color="blue"
                    delay={0.1}
                />
                <StatCard
                    label="IN (Working)"
                    value={data?.summary.in || 0}
                    icon={<CheckCircle2 className="h-6 w-6" />}
                    color="green"
                    delay={0.2}
                />
                <StatCard
                    label="ON BREAK"
                    value={data?.summary.break || 0}
                    icon={<PauseCircle className="h-6 w-6" />}
                    color="yellow"
                    delay={0.3}
                />
                <StatCard
                    label="IN MEETING"
                    value={data?.summary.meeting || 0}
                    icon={<Users className="h-6 w-6" />}
                    color="purple"
                    delay={0.35}
                />
                <StatCard
                    label="OUT"
                    value={data?.summary.out || 0}
                    icon={<LogOut className="h-6 w-6" />}
                    color="slate"
                    delay={0.4}
                />
            </div>

            {/* Filters and Search */}
            <DashboardCard className="p-4" delay={0.5}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-card-bg/50 border border-border-color/50 rounded-xl py-3 pl-12 pr-4 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="flex p-1 bg-card-bg/50 rounded-xl border border-border-color/50 self-start lg:self-center">
                        {["ALL", "IN", "BREAK", "MEETING", "OUT"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab as any)}
                                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === tab
                                    ? "bg-slate-700 text-text-primary shadow-lg"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </DashboardCard>

            {/* Member List */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {paginatedMembers.length > 0 ? (
                        paginatedMembers.map((member, idx) => (
                            <MemberListItem key={member.userId} member={member} index={idx} />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 bg-bg-secondary/20 rounded-3xl border border-dashed border-border-color"
                        >
                            <Users className="h-12 w-12 text-slate-700 mb-4" />
                            <p className="text-text-secondary font-medium text-lg">No members found</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between bg-bg-secondary/40 p-5 rounded-2xl border border-border-color backdrop-blur-sm shadow-xl mt-6">
                    <div className="text-[10px] text-text-secondary font-black uppercase tracking-[0.2em]">
                        Page <span className="text-text-primary">{page}</span> of <span className="text-text-primary">{totalPages}</span>
                        <span className="ml-3 text-blue-500 opacity-60">Total: {filteredMembers.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="h-9 px-4 rounded-xl bg-card-bg border border-border-color text-text-secondary hover:bg-blue-600 hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-black uppercase tracking-widest"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="h-9 px-4 rounded-xl bg-card-bg border border-border-color text-text-secondary hover:bg-blue-600 hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-black uppercase tracking-widest"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon, color, delay }: any) {
    const colorStyles: Record<string, string> = {
        blue: "from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/20",
        green: "from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/20",
        yellow: "from-amber-600/20 to-orange-600/20 text-amber-400 border-amber-500/20",
        purple: "from-purple-600/20 to-pink-600/20 text-purple-400 border-purple-500/20",
        slate: "from-slate-600/20 to-slate-500/20 text-text-secondary border-slate-500/20"
    };

    const style = colorStyles[color as string] || colorStyles.slate;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={`relative overflow-hidden p-6 rounded-3xl border bg-gradient-to-br ${style} shadow-xl backdrop-blur-md`}
        >
            <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-hover-bg border border-border-color">
                    {icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Live</span>
            </div>
            <h3 className="text-sm font-semibold opacity-70 mb-1">{label}</h3>
            <p className="text-3xl font-bold text-text-primary tracking-tight">{value}</p>
        </motion.div>
    );
}

function MemberListItem({ member, index }: { member: Member; index: number }) {
    const statusColors = {
        IN: "bg-emerald-500 shadow-emerald-500/50",
        BREAK: "bg-amber-500 shadow-amber-500/50",
        MEETING: "bg-purple-500 shadow-purple-500/50",
        OUT: "bg-slate-600 shadow-slate-600/50"
    };

    const relativeTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins} minutes ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} hours ago`;
        return `${Math.floor(hours / 24)} days ago`;
    };

    const formattedTime = (date: string) => {
        return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-bg-secondary/40 border border-border-color hover:border-border-color hover:bg-bg-secondary/60 p-4 rounded-2xl flex items-center justify-between transition-all backdrop-blur-sm"
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-border-color group-hover:border-border-color transition-all flex items-center justify-center bg-card-bg text-text-secondary font-bold uppercase">
                        {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                        ) : (
                            <span>{member.name.split(" ").map(n => n[0]).join("")}</span>
                        )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${statusColors[member.status]} shadow-lg`} />
                </div>

                {/* Info */}
                <div>
                    <h4 className="text-text-primary font-bold group-hover:text-blue-400 transition-colors">{member.name}</h4>
                    <p className="text-xs text-text-secondary flex items-center gap-1">
                        {formattedTime(member.lastActivityAt)}, {relativeTime(member.lastActivityAt)}
                    </p>
                </div>
            </div>

            <div className="hidden sm:flex items-center gap-8">
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest mb-1">Current Status</p>
                    <span className={`text-[10px] font-extrabold uppercase tracking-tight px-2.5 py-1 rounded-full ${member.status === "IN" ? "bg-emerald-500/10 text-emerald-500" :
                        member.status === "BREAK" ? "bg-amber-500/10 text-amber-500" :
                        member.status === "MEETING" ? "bg-purple-500/10 text-purple-500" :
                            "bg-slate-500/10 text-text-secondary"
                        }`}>
                        {member.status === "IN" ? "Working" : 
                         member.status === "BREAK" ? "On Break" : 
                         member.status === "MEETING" ? "In Meeting" : 
                         "Offline"}
                    </span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-text-secondary group-hover:translate-x-1 transition-all" />
            </div>
        </motion.div>
    );
}
