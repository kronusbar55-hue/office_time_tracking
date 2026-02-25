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
    status: "IN" | "BREAK" | "OUT";
    lastActivityAt: string;
    timezone: string;
}

interface Summary {
    total: number;
    in: number;
    break: number;
    out: number;
}

export default function LiveAttendancePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ summary: Summary; members: Member[] } | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"ALL" | "IN" | "BREAK" | "OUT">("ALL");
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

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

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw className="h-10 w-10 text-blue-500 animate-spin" />
                    <p className="text-slate-400 font-medium">Loading Live Data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 min-h-screen bg-slate-950">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">Live Attendance</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Last refreshed: {lastRefreshed.toLocaleTimeString()}
                    </p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchData(); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh Now
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                        />
                    </div>
                    <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 self-start lg:self-center">
                        {["ALL", "IN", "BREAK", "OUT"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab as any)}
                                className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === tab
                                    ? "bg-slate-700 text-white shadow-lg"
                                    : "text-slate-400 hover:text-slate-200"
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
                    {filteredMembers.length > 0 ? (
                        filteredMembers.map((member, idx) => (
                            <MemberListItem key={member.userId} member={member} index={idx} />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800"
                        >
                            <Users className="h-12 w-12 text-slate-700 mb-4" />
                            <p className="text-slate-500 font-medium text-lg">No members found</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon, color, delay }: any) {
    const colorStyles: Record<string, string> = {
        blue: "from-blue-600/20 to-indigo-600/20 text-blue-400 border-blue-500/20",
        green: "from-emerald-600/20 to-teal-600/20 text-emerald-400 border-emerald-500/20",
        yellow: "from-amber-600/20 to-orange-600/20 text-amber-400 border-amber-500/20",
        slate: "from-slate-600/20 to-slate-500/20 text-slate-400 border-slate-500/20"
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
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                    {icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Live</span>
            </div>
            <h3 className="text-sm font-semibold opacity-70 mb-1">{label}</h3>
            <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
        </motion.div>
    );
}

function MemberListItem({ member, index }: { member: Member; index: number }) {
    const statusColors = {
        IN: "bg-emerald-500 shadow-emerald-500/50",
        BREAK: "bg-amber-500 shadow-amber-500/50",
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
            className="group bg-slate-900/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 p-4 rounded-2xl flex items-center justify-between transition-all backdrop-blur-sm"
        >
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                    <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-slate-800 group-hover:border-slate-600 transition-all flex items-center justify-center bg-slate-800 text-slate-400 font-bold uppercase">
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
                    <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">{member.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                        {formattedTime(member.lastActivityAt)}, {relativeTime(member.lastActivityAt)} ({member.timezone})
                    </p>
                </div>
            </div>

            <div className="hidden sm:flex items-center gap-8">
                <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest mb-1">Current Status</p>
                    <span className={`text-[10px] font-extrabold uppercase tracking-tight px-2.5 py-1 rounded-full ${member.status === "IN" ? "bg-emerald-500/10 text-emerald-500" :
                        member.status === "BREAK" ? "bg-amber-500/10 text-amber-500" :
                            "bg-slate-500/10 text-slate-500"
                        }`}>
                        {member.status === "IN" ? "Working" : member.status === "BREAK" ? "On Break" : "Offline"}
                    </span>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
            </div>
        </motion.div>
    );
}
