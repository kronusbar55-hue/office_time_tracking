"use client";

import React from "react";
import { motion } from "framer-motion";

interface WeeklyAttendanceChartProps {
    last7Days: string[];
    weeklyAttendance: { _id: string; count: number }[];
    activeEmployees: number;
    dateStr: string;
}

export default function WeeklyAttendanceChart({
    last7Days,
    weeklyAttendance,
    activeEmployees,
    dateStr
}: WeeklyAttendanceChartProps) {
    return (
        <div className="h-48 flex items-end justify-between gap-2 px-4">
            {last7Days.map((day) => {
                const dayData = weeklyAttendance.find(w => w._id === day);
                const count = dayData?.count || 0;
                const height = activeEmployees > 0 ? (count / activeEmployees) * 100 : 0;
                const dateLabel = new Date(day).toLocaleDateString("en-US", { weekday: "short" });
                const isToday = day === dateStr;

                return (
                    <div key={day} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="relative w-full flex justify-center">
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                className={`w-full max-w-[40px] rounded-t-lg transition-colors ${isToday ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-700 group-hover:bg-slate-600'
                                    }`}
                            />
                            <div className="absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                {count} Present
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>{dateLabel}</span>
                    </div>
                );
            })}
        </div>
    );
}
