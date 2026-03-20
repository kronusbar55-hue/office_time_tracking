"use client";

import React, { useEffect, useState, useMemo } from "react";
import { format, parseISO, startOfDay, addMinutes, differenceInMinutes, isWithinInterval } from "date-fns";
import { Clock, Coffee, Monitor, Zap, MousePointer2, Type, Move, X, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MonitorTimelineProps {
    userId: string;
    date: string;
    onClose: () => void;
}

export default function MonitorTimeline({ userId, date, onClose }: MonitorTimelineProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredSegment, setHoveredSegment] = useState<any>(null);

    useEffect(() => {
        const fetchTimeline = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/monitor/timeline?userId=${userId}&date=${date}`);
                const json = await res.json();
                if (json.success) {
                    setData(json.data);
                }
            } catch (error) {
                console.error("Failed to fetch timeline", error);
            } finally {
                setLoading(false);
            }
        };

        if (userId && date) fetchTimeline();
    }, [userId, date]);

    // Timeline Configuration (9 AM to 9 PM = 12 hours)
    const START_HOUR = 8;
    const END_HOUR = 22;
    const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes("break")) return "bg-orange-500";
        if (s.includes("meeting")) return "bg-purple-500";
        if (s.includes("idle")) return "bg-yellow-500";
        return "bg-emerald-500";
    };

    // Calculate segments positions
    const segments = useMemo(() => {
        if (!data.length) return [];

        const dayStart = startOfDay(new Date(date));
        const timelineStart = addMinutes(dayStart, START_HOUR * 60);

        return data.map((item, idx) => {
            const itemDate = new Date(item.time);
            const minutesSinceStart = differenceInMinutes(itemDate, timelineStart);
            const left = (minutesSinceStart / TOTAL_MINUTES) * 100;

            // Assume each snapshot covers 10 minutes unless very close
            const width = (10 / TOTAL_MINUTES) * 100;

            return {
                ...item,
                left: Math.max(0, Math.min(100, left)),
                width: Math.min(100 - left, width),
                formattedTime: format(itemDate, "hh:mm a")
            };
        });
    }, [data, date]);

    // Summary stats
    const stats = useMemo(() => {
        if (!data.length) return null;
        const first = data[0];
        const last = data[data.length - 1];

        return {
            start: format(new Date(first.time), "hh:mm a"),
            end: format(new Date(last.time), "hh:mm a"),
            totalBreak: last.breakTime || "00:00:00",
            totalSession: last.sessionTime || "00:00:00"
        };
    }, [data]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full bg-bg-secondary/80 backdrop-blur-xl border border-border-color rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full bg-hover-bg hover:bg-hover-bg text-text-primary/50 hover:text-text-primary transition-all z-20"
            >
                <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-8 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent/20 rounded-2xl border border-accent/30 text-accent">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter">Activity <span className="text-accent underline decoration-accent/30">Timeline</span></h3>
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] mt-1">{format(parseISO(date), "MMMM dd, yyyy")}</p>
                        </div>
                    </div>

                    {stats && !loading && (
                        <div className="flex gap-4">
                            <StatPill icon={<Zap />} label="START" value={stats.start} />
                            <StatPill icon={<Monitor />} label="END" value={stats.end} />
                            <StatPill icon={<Coffee />} label="BREAK" value={stats.totalBreak} accent />
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="h-48 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">Reconstructing Day...</p>
                        </div>
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-600 italic">
                        No activity data found for this date.
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* The Timeline Track */}
                        <div className="relative pt-8 pb-12">
                            {/* Hours Labels */}
                            <div className="absolute top-0 inset-x-0 flex justify-between px-1">
                                {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1.5">
                                        <div className="h-2 w-[1px] bg-bg-primary/20" />
                                        <span className="text-[8px] font-black text-text-secondary tracking-tighter">
                                            {((START_HOUR + i) % 12 === 0 ? 12 : (START_HOUR + i) % 12)} {(START_HOUR + i) >= 12 ? 'PM' : 'AM'}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Track Container */}
                            <div className="h-14 bg-black/40 rounded-2xl border border-border-color relative mt-6 flex items-center overflow-hidden">
                                {/* Vertical Grid Lines */}
                                {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="absolute h-full w-[1px] bg-hover-bg"
                                        style={{ left: `${(i / ((END_HOUR - START_HOUR) * 2)) * 100}%` }}
                                    />
                                ))}

                                {/* Segments */}
                                {segments.map((seg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scaleY: 0 }}
                                        animate={{ opacity: 1, scaleY: 1 }}
                                        transition={{ delay: i * 0.01 }}
                                        onMouseEnter={() => setHoveredSegment(seg)}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                        className={`absolute h-full cursor-help transition-all hover:scale-y-110 hover:z-20 hover:shadow-xl ${getStatusColor(seg.status)}`}
                                        style={{
                                            left: `${seg.left}%`,
                                            width: `${seg.width}%`,
                                            opacity: seg.stats.active > 0 ? 1 : 0.4
                                        }}
                                    />
                                ))}

                                {/* Current Time Indicator (if date is today) */}
                                {date === format(new Date(), "yyyy-MM-dd") && (
                                    <div
                                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-30"
                                        style={{ left: `${(differenceInMinutes(new Date(), addMinutes(startOfDay(new Date()), START_HOUR * 60)) / TOTAL_MINUTES) * 100}%` }}
                                    >
                                        <div className="w-2 h-2 rounded-full bg-red-500 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="flex gap-6 mt-8 justify-center">
                                <LegendItem color="bg-emerald-500" label="ACTIVE" />
                                <LegendItem color="bg-yellow-500/60" label="IDLE" />
                                <LegendItem color="bg-orange-500" label="BREAK" />
                                <LegendItem color="bg-purple-500" label="MEETING" />
                            </div>
                        </div>

                        {/* Hover Details Panel */}
                        <AnimatePresence mode="wait">
                            {hoveredSegment ? (
                                <motion.div
                                    key="details"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="bg-black/60 rounded-3xl border border-border-color p-6 flex flex-wrap gap-12 items-center"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">Time Slice</span>
                                        <span className="text-2xl font-black text-text-primary uppercase">{hoveredSegment.formattedTime}</span>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className={`h-2 w-2 rounded-full ${getStatusColor(hoveredSegment.status)} shadow-lg shadow-emerald-500/20`} />
                                            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{hoveredSegment.status}</span>
                                        </div>
                                    </div>

                                    <div className="h-12 w-[1px] bg-hover-bg" />

                                    <div className="flex gap-8">
                                        <DetailStat icon={<MousePointer2 />} label="CLICKS" value={hoveredSegment.stats.clicks} />
                                        <DetailStat icon={<Type />} label="KEYS" value={hoveredSegment.stats.keys} />
                                        <DetailStat icon={<Zap />} label="ACTIVE" value={`${hoveredSegment.stats.active}s`} />
                                        <DetailStat icon={<Coffee />} label="CUMULATIVE BREAK" value={hoveredSegment.breakTime || "00:00:00"} />
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="hint"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-[104px] flex items-center justify-center border border-dashed border-border-color rounded-3xl bg-bg-primary/2"
                                >
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <Info className="h-4 w-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Hover over the timeline segments to explore activity details</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Background Accent */}
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        </motion.div>
    );
}

function StatPill({ icon, label, value, accent = false }: { icon: any, label: string, value: string, accent?: boolean }) {
    return (
        <div className={`flex flex-col items-center px-6 py-2 rounded-2xl border ${accent ? 'bg-accent text-slate-950 border-accent' : 'bg-black/40 text-text-primary border-border-color'}`}>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${accent ? 'opacity-60' : 'text-text-secondary'}`}>{label}</span>
            <div className="flex items-center gap-2">
                <span className={accent ? 'text-slate-900' : 'text-accent'}>{React.cloneElement(icon, { size: 12 })}</span>
                <span className="text-sm font-black tabular-nums font-mono">{value}</span>
            </div>
        </div>
    );
}

function LegendItem({ color, label }: { color: string, label: string }) {
    return (
        <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <div className={`h-2.5 w-5 rounded-sm ${color}`} />
            <span className="text-[9px] font-black text-text-primary/50 tracking-widest">{label}</span>
        </div>
    );
}

function DetailStat({ icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex flex-col">
            <div className="flex items-center gap-2 text-text-secondary mb-1">
                {React.cloneElement(icon, { size: 10 })}
                <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xl font-black text-text-primary tabular-nums">{value}</span>
        </div>
    );
}
