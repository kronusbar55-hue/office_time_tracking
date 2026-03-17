"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Clock } from "lucide-react";

interface LiveTimerProps {
    initialSeconds?: number;
    isActive?: boolean;
}

export default function LiveTimer({ initialSeconds = 0, isActive = false }: LiveTimerProps) {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        let interval: any;
        if (isActive) {
            const startTime = Date.now() - seconds * 1000;
            interval = setInterval(() => {
                setSeconds(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            {/* <Clock className={`h-4 w-4 ${isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="text-lg font-bold tabular-nums tracking-tight text-white">
                {formatTime(seconds)}
            </span> */}
        </div>
    );
}
