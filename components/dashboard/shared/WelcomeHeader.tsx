"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface WelcomeHeaderProps {
    firstName?: string;
    lastName?: string;
    progress?: number;
    showGoalMessage?: boolean;
    variant?: "default" | "compact";
}

export default function WelcomeHeader({ firstName, lastName, progress = 0, showGoalMessage = true, variant = "default" }: WelcomeHeaderProps) {
    const [greeting, setGreeting] = useState("");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good Morning");
        else if (hour < 17) setGreeting("Good Afternoon");
        else setGreeting("Good Evening");
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-border-color ${variant === "compact" ? "p-4 md:p-6" : "p-8"}`}>
            {/* Decorative Blur Spheres */}
            <div className={`absolute -top-10 -right-10 rounded-full bg-blue-500/20 blur-3xl animate-pulse ${variant === "compact" ? "h-24 w-24" : "h-40 w-40"}`} />
            <div className={`absolute -bottom-10 -left-10 rounded-full bg-purple-500/20 blur-3xl ${variant === "compact" ? "h-20 w-20" : "h-32 w-32"}`} />

            <div className={`relative z-10 flex flex-col md:flex-row md:items-center justify-between ${variant === "compact" ? "gap-2" : "gap-6"}`}>
                <div>
                    <h2 className={`font-medium text-blue-400 uppercase tracking-wider ${variant === "compact" ? "text-[10px] mb-0.5" : "text-sm mb-1"}`}>
                        {greeting}
                    </h2>
                    <h1 className={`font-bold text-text-primary ${variant === "compact" ? "text-xl" : "text-3xl mb-2"}`}>
                        Welcome back, {firstName} {lastName}
                    </h1>
                </div>
            </div>
        </motion.div>
    );
}
