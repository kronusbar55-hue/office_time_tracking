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

    // return (
    // <div className="flex items-center gap-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 p-4 backdrop-blur-md">


    {/* <div className="relative"> */ }
    {/* <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${isActive ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        } border`} */}
    {/* > */ }
    {/* <AnimatePresence mode="wait">
                        {isActive ? (
                            <motion.div
                                key="pause"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                            >
                                <Pause className="h-5 w-5 fill-current" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="play"
                                initial={{ rotate: -90, opacity: 0 }}
                                animate={{ rotate: 0, opacity: 1 }}
                                exit={{ rotate: 90, opacity: 0 }}
                            >
                                <Play className="h-5 w-5 fill-current ml-1" />
                            </motion.div>
                        )}
                    </AnimatePresence> */}
    {/* </motion.button> */ }
    {/* {isActive && (
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 0.2 }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-blue-500 z-[-1]"
                    />
                )}
            </div> */}
    // </div>
    // );
}
