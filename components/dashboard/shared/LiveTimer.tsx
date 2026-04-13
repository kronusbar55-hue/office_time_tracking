"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Clock } from "lucide-react";

interface LiveTimerProps {
    initialSeconds?: number;
    isActive?: boolean;
}

export default function LiveTimer({ initialSeconds = 0 }: LiveTimerProps) {
    const [seconds, setSeconds] = useState(initialSeconds);

    useEffect(() => {
        setSeconds(initialSeconds);
    }, [initialSeconds]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card-bg/50 border border-border-color/50">
            {/* <Clock className={`h-4 w-4 ${isActive ? 'text-emerald-400 animate-pulse' : 'text-text-secondary'}`} />
            <span className="text-lg font-bold tabular-nums tracking-tight text-text-primary">
                {formatTime(seconds)}
            </span> */}
        </div>
    );
}
