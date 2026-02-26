"use client";

import React, { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCcw, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

// Data structure for chart
interface ChartDataPoint {
    name: string;
    worked: number;
    break: number;
    overtime: number;
    rawDate: string;
}

export default function TrackedHoursChart() {
    const [filter, setFilter] = useState<"Day" | "Week" | "Month">("Week");
    const [data, setData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Map Day/Week/Month to API expected values
            const period = filter.toLowerCase();
            const res = await fetch(`/api/time-entries/stats?period=${period}`);
            if (!res.ok) throw new Error("Failed to fetch statistics");
            const result = await res.json();

            const mappedData: ChartDataPoint[] = result.stats.map((s: any) => {
                const dateObj = parseISO(s.date);
                let name = "";

                if (filter === "Day") {
                    name = format(dateObj, "EEE");
                } else if (filter === "Week") {
                    name = format(dateObj, "MMM dd");
                } else {
                    name = format(dateObj, "dd");
                }

                return {
                    name,
                    worked: Math.round((s.workedMinutes / 60) * 10) / 10,
                    break: Math.round((s.breakMinutes / 60) * 10) / 10,
                    overtime: Math.round((s.overtimeMinutes / 60) * 10) / 10,
                    rawDate: s.date
                };
            });

            setData(mappedData);
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, [filter]);

    const currentData = data;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                    <p className="text-slate-200 font-bold mb-2">{label}</p>
                    <div className="space-y-1">
                        {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-3">
                                <div
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-xs text-slate-400 capitalize">{entry.name}:</span>
                                <span className="text-xs font-bold text-white">{entry.value}h</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Tabs */}
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white">Tracked Hours</h3>
                <div className="flex p-1 bg-slate-800/50 rounded-xl border border-white/5">
                    {["Day", "Week", "Month"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab as any)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === tab
                                ? "bg-blue-500 text-white shadow-lg"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-grow min-h-[300px] relative">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] z-10"
                        >
                            <RefreshCcw className="h-8 w-8 text-blue-500 animate-spin" />
                        </motion.div>
                    ) : error ? (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2"
                        >
                            <AlertCircle className="h-8 w-8 text-red-500/50" />
                            <p className="text-sm">{error}</p>
                            <button
                                onClick={fetchData}
                                className="mt-2 text-xs font-bold text-blue-400 hover:underline"
                            >
                                Try Again
                            </button>
                        </motion.div>
                    ) : data.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-slate-500"
                        >
                            <p className="text-sm font-medium">No tracked hours found for this period</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full h-full"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={currentData}
                                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                    barGap={8}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#334155"
                                        opacity={0.3}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 500 }}
                                        dy={10}
                                        interval={filter === "Week" ? 4 : 0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)", radius: 10 }} />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ paddingTop: 0, paddingBottom: 20, fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}
                                    />
                                    <Bar
                                        dataKey="worked"
                                        name="Worked Hours"
                                        fill="#4ADE80"
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                    />
                                    <Bar
                                        dataKey="break"
                                        name="Break Hours"
                                        fill="#FACC15"
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                    />
                                    <Bar
                                        dataKey="overtime"
                                        name="Overtime Hours"
                                        fill="#F87171"
                                        radius={[4, 4, 0, 0]}
                                        animationDuration={1500}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
