"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface WelcomeHeaderProps {
    firstName?: string;
    lastName?: string;
    progress?: number;
    showGoalMessage?: boolean;
}

export default function WelcomeHeader({ firstName, lastName, progress = 0, showGoalMessage = true }: WelcomeHeaderProps) {
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
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 p-8 border border-white/10">
            {/* Decorative Blur Spheres */}
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-1">
                        {greeting}
                    </h2>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Welcome back, {firstName} {lastName}
                    </h1>
                </div>
            </div>
        </motion.div>
    );
}
