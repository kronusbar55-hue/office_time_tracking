"use client";

import React from "react";
import { motion } from "framer-motion";

interface DashboardCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export default function DashboardCard({ children, className = "", delay = 0 }: DashboardCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            className={`relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-xl transition-colors hover:border-blue-500/30 ${className}`}
        >
            {/* Subtle Glow Effect */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />

            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}
