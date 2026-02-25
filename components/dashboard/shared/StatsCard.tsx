"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import DashboardCard from "./DashboardCard";

interface StatsCardProps {
    label: string;
    value: string | number;
    subtext?: string;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    delay?: number;
    color?: "blue" | "green" | "yellow" | "purple" | "orange";
}

export default function StatsCard({
    label,
    value,
    subtext,
    icon,
    trend,
    delay = 0,
    color = "blue"
}: StatsCardProps) {
    const colorMap = {
        blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        green: "bg-green-500/20 text-green-400 border-green-500/30",
        yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
        orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };

    return (
        <DashboardCard delay={delay} className="group">
            <div className="flex items-start justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${colorMap[color]} transition-transform group-hover:scale-110`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-0.5 text-xs font-bold ${trend.isPositive ? "text-green-400" : "text-red-400"}`}>
                        {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {trend.value}%
                    </div>
                )}
            </div>

            <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                    <motion.h3
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-2xl font-bold text-white"
                    >
                        {value}
                    </motion.h3>
                    {subtext && <span className="text-xs text-slate-500">{subtext}</span>}
                </div>
            </div>
        </DashboardCard>
    );
}
