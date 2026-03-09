"use client";

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    MousePointer2,
    Move,
    Type,
    Clock,
    Globe,
    Maximize2,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Monitor,
    PieChart
} from "lucide-react";

interface EmployeeActivityCardProps {
    employee: any;
    viewMode: "grid" | "list";
    showName?: boolean;
}

export default function EmployeeActivityCard({ employee, viewMode, showName = true }: EmployeeActivityCardProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const { activity } = employee;

    // Status color logic (simulated idle)
    const isActive = activity ? (activity.activeSeconds > activity.idleSeconds) : false;
    const normalizedStatus = (activity?.status || (activity ? (isActive ? "Active" : "Idle") : "Offline")).toUpperCase().replace(/_/g, " ");
    const statusLabel = normalizedStatus;

    const getStatusColor = (label: string) => {
        const l = label.toLowerCase();
        if (l.includes('active') || l.includes('online')) return "text-green-400 bg-green-400/10 border-green-400/20";
        if (l.includes('break')) return "text-orange-400 bg-orange-400/10 border-orange-400/20";
        if (l.includes('meeting')) return "text-purple-400 bg-purple-400/10 border-purple-400/20";
        if (l.includes('offline')) return "text-slate-500 bg-slate-500/10 border-slate-500/20";
        if (l.includes('idle')) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    };

    const statusColor = getStatusColor(statusLabel);

    if (viewMode === "list") {
        return (
            <div className="flex items-center gap-6 p-2 pr-6 rounded-xl bg-slate-900/60 border border-white/5 hover:border-accent/30 transition-all backdrop-blur-md group shadow-xl">
                {/* Boxy Thumbnail for List View */}
                <div
                    className="relative h-20 w-32 rounded-lg bg-slate-950 overflow-hidden cursor-zoom-in border border-white/10 shrink-0 group-hover:border-accent/20"
                    onClick={() => setIsZoomed(true)}
                >
                    {activity?.imageUrl ? (
                        <img src={activity.imageUrl} alt="Screen" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-slate-900/40 text-slate-700">
                            <Monitor className="h-6 w-6 opacity-20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="flex flex-col min-w-[120px]">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${statusColor.includes('green') ? 'bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">{statusLabel}</span>
                    </div>
                </div>

                {activity && (
                    <div className="flex-1 flex items-center justify-between px-8 border-l border-white/5">
                        <ListStat icon={<MousePointer2 />} label="Clicks" value={activity.mouseClicks} />
                        <ListStat icon={<Type />} label="Keys" value={activity.keyPresses} />
                        <ListStat icon={<Move />} label="Moves" value={activity.mouseMovements} />
                        <div className="flex flex-col items-center bg-accent/5 px-4 py-1.5 rounded-lg border border-accent/10">
                            <span className="text-[9px] text-accent font-black uppercase tracking-tighter">Session</span>
                            <span className="text-sm font-black text-white tabular-nums">{activity.sessionTime || "00:00"}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col rounded-2xl bg-slate-900/60 border border-white/10 overflow-hidden group hover:border-accent/50 transition-all hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl relative">
                {/* Header with Status Only */}
                <div className="p-3.5 flex items-center justify-center bg-slate-900/80 border-b border-white/10">
                    <div className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-inner ${statusColor} w-full text-center`}>
                        {statusLabel}
                    </div>
                </div>

                {/* Main Boxy Image Container */}
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden cursor-zoom-in group/img" onClick={() => setIsZoomed(true)}>
                    {activity?.imageUrl ? (
                        <>
                            <img
                                src={activity.imageUrl}
                                alt="Screen"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105"
                            />

                            {/* Detailed Boxy Overlay On Image */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-slate-950/90 border-t border-white/10 backdrop-blur-md flex flex-col gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <div className="grid grid-cols-2 gap-2">
                                    <DetailBox icon={<MousePointer2 />} value={activity.mouseClicks} label="CLICKS" />
                                    <DetailBox icon={<Type />} value={activity.keyPresses} label="KEYS" />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 w-full justify-center">
                                        <Clock className="h-3 w-3 text-accent" />
                                        <span className="text-[10px] font-black text-white tabular-nums">{activity.sessionTime || "0:0"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Center Action Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                <Maximize2 className="h-8 w-8 text-white/50" />
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 bg-slate-900/40">
                            <Monitor className="h-10 w-10 mb-2 opacity-10" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-20">PENDING</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Zoom Modal - Ultimate Boxy View */}
            {isZoomed && activity && (
                <div
                    className="fixed inset-0 z-[9999] bg-slate-950/98 backdrop-blur-3xl flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
                    onClick={() => setIsZoomed(false)}
                >
                    <div className="w-full max-w-[90vw] h-full flex flex-col gap-4">
                        {/* Modal Header - Identity Removed */}
                        <div className="flex items-center justify-between bg-slate-900/50 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                                    <Monitor className="h-8 w-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Session <span className="text-accent">Capture</span></h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">High Resolution Activity Insight</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${statusColor}`}>
                                    {statusLabel}
                                </div>
                                <button className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all">
                                    <Maximize2 className="h-6 w-6 rotate-180" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Image Body */}
                        <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl relative">
                            <img src={activity.imageUrl} alt="Full Resolution" className="w-full h-full object-contain" />

                            {/* Modal Sidebar Stats */}
                            <div className="absolute top-6 right-6 flex flex-col gap-4">
                                <ModalStatBox icon={<MousePointer2 />} value={activity.mouseClicks} label="CLICKS" />
                                <ModalStatBox icon={<Type />} value={activity.keyPresses} label="KEYS" />
                                <ModalStatBox icon={<Move />} value={activity.mouseMovements} label="MOVES" />
                                <ModalStatBox icon={<Clock />} value={activity.sessionTime || "00:00"} label="DURATION" accent />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function ListStat({ icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex flex-col items-center gap-0.5">
            <div className="text-slate-500 mb-0.5">{React.cloneElement(icon, { size: 12 })}</div>
            <span className="text-sm font-black text-white tabular-nums">{value}</span>
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{label}</span>
        </div>
    );
}

function DetailBox({ icon, value, label }: { icon: any, value: any, label: string }) {
    return (
        <div className="bg-white/5 border border-white/5 rounded-lg p-2 flex items-center gap-3">
            <div className="text-accent">{React.cloneElement(icon, { size: 12 })}</div>
            <div className="flex flex-col">
                <span className="text-xs font-black text-white leading-none">{value}</span>
                <span className="text-[7px] text-slate-500 font-black tracking-widest mt-0.5">{label}</span>
            </div>
        </div>
    );
}

function ModalStatBox({ icon, value, label, accent = false }: { icon: any, value: any, label: string, accent?: boolean }) {
    return (
        <div className={`w-32 p-4 rounded-xl border backdrop-blur-xl flex flex-col items-center gap-1 shadow-2xl ${accent ? 'bg-accent/20 border-accent/40' : 'bg-slate-900/80 border-white/10'}`}>
            <div className={accent ? 'text-white' : 'text-accent'}>{React.cloneElement(icon, { size: 18 })}</div>
            <span className="text-xl font-black text-white tabular-nums">{value}</span>
            <span className={`text-[8px] font-black tracking-widest ${accent ? 'text-white/60' : 'text-slate-500'}`}>{label}</span>
        </div>
    );
}

function HoverStat({ icon, value, label }: { icon: any, value: any, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-accent/60">{React.cloneElement(icon, { size: 10 })}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-bold text-white leading-none">{value}</p>
                <p className="text-[7px] text-slate-400 uppercase tracking-tighter mt-0.5">{label}</p>
            </div>
        </div>
    )
}

function Stat({ icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-slate-500">{React.cloneElement(icon, { size: 14 })}</div>
            <div>
                <p className="text-[10px] text-slate-500 font-medium tracking-tight uppercase">{label}</p>
                <p className="text-xs font-bold text-white">{value || 0}</p>
            </div>
        </div>
    )
}

function SmallStat({ icon, value, label }: { icon: any, value: any, label: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/40 border border-white/5 group-hover:bg-slate-950/60 transition-colors">
            <div className="text-accent mb-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {React.cloneElement(icon, { size: 14 })}
            </div>
            <span className="text-xs font-bold text-white leading-none">{value}</span>
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1 group-hover:text-slate-500 transition-colors">{label}</span>
        </div>
    )
}
