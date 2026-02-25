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

const DAY_DATA = [
    { name: "08:00", worked: 0, break: 0, overtime: 0 },
    { name: "10:00", worked: 1.5, break: 0.2, overtime: 0 },
    { name: "12:00", worked: 3.5, break: 0.5, overtime: 0 },
    { name: "14:00", worked: 5.0, break: 0.8, overtime: 0 },
    { name: "16:00", worked: 6.5, break: 1.0, overtime: 0 },
    { name: "18:00", worked: 8.0, break: 1.0, overtime: 0.5 },
    { name: "20:00", worked: 8.5, break: 1.0, overtime: 1.2 },
];

const WEEK_DATA = [
    { name: "Mon", worked: 7.5, break: 1.0, overtime: 0.5 },
    { name: "Tue", worked: 8.0, break: 0.5, overtime: 1.0 },
    { name: "Wed", worked: 6.5, break: 1.5, overtime: 0 },
    { name: "Thu", worked: 8.5, break: 0.8, overtime: 1.5 },
    { name: "Fri", worked: 7.0, break: 1.0, overtime: 0.2 },
    { name: "Sat", worked: 0, break: 0, overtime: 0 },
    { name: "Sun", worked: 0, break: 0, overtime: 0 },
];

const MONTH_DATA = [
    { name: "Week 1", worked: 38, break: 5, overtime: 3 },
    { name: "Week 2", worked: 40, break: 4, overtime: 5 },
    { name: "Week 3", worked: 36, break: 6, overtime: 2 },
    { name: "Week 4", worked: 42, break: 5, overtime: 6 },
];

export default function TrackedHoursChart() {
    const [filter, setFilter] = useState<"Day" | "Week" | "Month">("Week");

    const getData = () => {
        switch (filter) {
            case "Day": return DAY_DATA;
            case "Month": return MONTH_DATA;
            default: return WEEK_DATA;
        }
    };

    const currentData = getData();

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
            <div className="flex-grow min-h-[300px]">
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
                            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
                            dy={10}
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
            </div>
        </div>
    );
}
