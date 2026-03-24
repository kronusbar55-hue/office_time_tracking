"use client";

import React, { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
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
    PieChart,
    Briefcase
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
        if (l.includes('offline')) return "text-text-secondary bg-slate-500/10 border-slate-500/20";
        if (l.includes('idle')) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
        return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    };

    const statusColor = getStatusColor(statusLabel);

    // Mouse Activity Border Logic based on Clicks, Key Presses, and Movements
    const getActivityBorderClass = (clicks: number, keyPresses: number, movements: number) => {
        const totalActivity = clicks + keyPresses + movements;

        // Threshold logic:
        // Red: Low activity (less than 20 total interactions)
        // Green: High activity (more than 100 total interactions)
        // Yellow: Moderate activity (between 20 and 100)
        if (totalActivity < 20) return "border-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]";
        if (totalActivity > 100) return "border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]";
        return "border-4 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]";
    };

    const activityBorderClass = activity ? getActivityBorderClass(activity.mouseClicks, activity.keyPresses || 0, activity.mouseMovements || 0) : "border-[4px] border-border-color";

    if (viewMode === "list") {
        return (
            <div className={`flex items-center gap-6 p-2 pr-6 rounded-xl bg-bg-secondary/60 hover:border-accent/30 transition-all backdrop-blur-md group shadow-xl ${activityBorderClass}`}>
                {/* Boxy Thumbnail for List View */}
                <div
                    className={`relative h-20 w-32 rounded-lg bg-bg-primary overflow-hidden cursor-zoom-in border shrink-0 transition-all ${activityBorderClass}`}
                    onClick={() => setIsZoomed(true)}
                >
                    {activity?.imageUrl ? (
                        <img src={activity.imageUrl} alt="Screen" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center bg-bg-secondary/40 text-slate-700">
                            <Monitor className="h-6 w-6 opacity-20" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="flex flex-col min-w-[120px]">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${statusColor.includes('green') ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
                        <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{statusLabel}</span>
                    </div>
                </div>

                {activity && (
                    <div className="flex-1 flex items-center justify-between px-8 border-l border-border-color">
                        <ListStat icon={<MousePointer2 />} label="Clicks" value={activity.mouseClicks} />
                        <ListStat icon={<Type />} label="Keys" value={activity.keyPresses} />
                        <ListStat icon={<Move />} label="Moves" value={activity.mouseMovements} />
                        <div className="flex flex-col items-center bg-hover-bg px-4 py-1.5 rounded-lg border border-border-color">
                            <span className="text-[9px] text-text-secondary font-black uppercase tracking-tighter">Time</span>
                            <span className="text-sm font-black text-text-primary tabular-nums">
                                {activity.time ? activity.time.substring(0, 5) : (activity.createdAt ? format(new Date(activity.createdAt), "HH:mm") : "--:--")}
                            </span>
                        </div>
                        <div className="flex flex-col items-center bg-accent/5 px-4 py-1.5 rounded-lg border border-accent/10">
                            <span className="text-[9px] text-accent font-black uppercase tracking-tighter">Session</span>
                            <span className="text-sm font-black text-text-primary tabular-nums">{activity.sessionTime || "00:00"}</span>
                        </div>
                        {activity.projects && activity.projects.length > 0 && (
                            <div className="flex flex-col items-start bg-card-bg/40 px-4 py-1.5 rounded-lg border border-border-color max-w-[200px]">
                                <span className="text-[9px] text-text-secondary font-bold uppercase tracking-tight">Active Projects</span>
                                <div className="text-[10px] text-text-primary font-medium truncate w-full">
                                    {activity.projects.map((p: any) => p.update).join(", ")}
                                </div>
                            </div>
                        )}
                        {activity.appUsage && Object.keys(activity.appUsage).length > 0 && (
                            <div className="flex flex-col items-start bg-accent/5 px-4 py-1.5 rounded-lg border border-accent/10 max-w-[120px] hidden xl:flex">
                                <span className="text-[9px] text-accent font-bold uppercase tracking-tight">Top App</span>
                                <div className="text-[10px] text-text-primary font-medium truncate w-full">
                                    {Object.entries(activity.appUsage).sort((a: any, b: any) => b[1] - a[1])[0][0].replace(/_/g, ' ')}
                                    <span className="ml-1 text-[9px] text-accent font-bold">({formatUsageTime(Object.entries(activity.appUsage).sort((a: any, b: any) => b[1] - a[1])[0][1] as number)})</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className={`flex flex-col rounded-2xl bg-bg-secondary/60 border overflow-hidden group hover:border-accent/50 transition-all hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl relative ${activityBorderClass}`}>           

                {/* Main Boxy Image Container */}
                <div className="relative aspect-video w-full bg-bg-primary overflow-hidden cursor-zoom-in group/img" onClick={() => setIsZoomed(true)}>
                    {activity?.imageUrl ? (
                        <>
                            <img
                                src={activity.imageUrl}
                                alt="Screen"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-105"
                            />

                            {/* Time Badge on Image */}
                            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md border border-border-color z-10">
                                <span className="text-[10px] font-black text-text-primary tabular-nums">
                                    {activity.time ? activity.time.substring(0, 5) : (activity.createdAt ? format(new Date(activity.createdAt), "HH:mm") : "--:--")}
                                </span>
                            </div>

                            {/* Detailed Boxy Overlay On Image */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-bg-primary/90 border-t border-border-color backdrop-blur-md flex flex-col gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <div className="grid grid-cols-2 gap-2">
                                    <DetailBox icon={<MousePointer2 />} value={activity.mouseClicks} label="CLICKS" />
                                    <DetailBox icon={<Type />} value={activity.keyPresses} label="KEYS" />
                                </div>
                                {activity.appUsage && Object.keys(activity.appUsage).length > 0 && (
                                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-accent/5 border border-accent/10 mt-1">
                                        <PieChart className="h-2.5 w-2.5 text-accent" />
                                        <span className="text-[9px] font-black text-text-secondary uppercase tracking-tighter truncate max-w-[140px]">
                                            {Object.entries(activity.appUsage).sort((a: any, b: any) => b[1] - a[1])[0][0].replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[9px] font-black text-accent ml-auto whitespace-nowrap">{formatUsageTime(Object.entries(activity.appUsage).sort((a: any, b: any) => b[1] - a[1])[0][1] as number)}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-hover-bg border border-border-color w-full justify-center">
                                        <Clock className="h-3 w-3 text-accent" />
                                        <span className="text-[10px] font-black text-text-primary tabular-nums">{activity.sessionTime || "00:00"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Center Action Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                <Maximize2 className="h-8 w-8 text-text-primary/50" />
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800 bg-bg-secondary/40">
                            <Monitor className="h-10 w-10 mb-2 opacity-10" />
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-20">PENDING</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Zoom Modal - Ultimate Boxy View */}
            {isZoomed && activity && (
                <div
                    className="fixed inset-0 z-[9999] bg-bg-primary/98 backdrop-blur-3xl flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
                    onClick={() => setIsZoomed(false)}
                >
                    <div className="w-full max-w-[90vw] h-full flex flex-col gap-4">
                        {/* Modal Header - Identity Removed */}
                        <div className="flex items-center justify-between bg-bg-secondary/50 p-6 rounded-2xl border border-border-color backdrop-blur-xl">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                                    <Monitor className="h-8 w-8" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase">Session <span className="text-accent">Capture</span></h2>
                                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.4em] mt-1">High Resolution Activity Insight</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border ${statusColor}`}>
                                    {statusLabel}
                                </div>
                                <button className="h-12 w-12 rounded-xl bg-hover-bg border border-border-color text-text-primary flex items-center justify-center hover:bg-hover-bg transition-all">
                                    <Maximize2 className="h-6 w-6 rotate-180" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Image Body */}
                        <div className={`flex-1 w-full rounded-2xl overflow-hidden border bg-black shadow-2xl relative ${activityBorderClass}`}>
                            <img src={activity.imageUrl} alt="Full Resolution" className="w-full h-full object-contain" />

                            {/* Modal Sidebar Stats */}
                            <div className="absolute top-6 right-6 flex flex-col gap-4">
                                <ModalStatBox icon={<MousePointer2 />} value={activity.mouseClicks} label="CLICKS" />
                                <ModalStatBox icon={<Type />} value={activity.keyPresses} label="KEYS" />
                                <ModalStatBox icon={<Move />} value={activity.mouseMovements} label="MOVES" />
                                <ModalStatBox icon={<Clock />} value={activity.sessionTime || "00:00"} label="DURATION" accent />
                            </div>

                            {/* App Usage Overlay in Modal */}
                            {activity.appUsage && Object.keys(activity.appUsage).length > 0 && (
                                <div className="absolute top-6 left-6 max-w-[240px] bg-bg-secondary/90 border border-border-color p-5 rounded-2xl backdrop-blur-xl animate-in slide-in-from-left-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <PieChart className="h-4 w-4 text-accent" />
                                        <span className="text-xs font-black text-text-primary uppercase tracking-wider">App Usage</span>
                                    </div>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                        {Object.entries(activity.appUsage)
                                            .sort((a: any, b: any) => b[1] - a[1])
                                            .slice(0, 10)
                                            .map(([app, seconds], idx) => (
                                                <div key={idx} className="flex flex-col gap-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight truncate max-w-[140px]">
                                                            {app.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-[10px] font-black text-accent tabular-nums">
                                                            {formatUsageTime(seconds as number)}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-hover-bg h-1 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-accent h-full rounded-full transition-all duration-1000" 
                                                            style={{ width: `${Math.min(100, ((seconds as number) / (activity.activeSeconds || 600)) * 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Projects Overlay in Modal */}
                            {activity.projects && activity.projects.length > 0 && (
                                <div className="absolute bottom-6 left-6 max-w-sm bg-bg-secondary/90 border border-border-color p-5 rounded-2xl backdrop-blur-xl animate-in slide-in-from-bottom-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Briefcase className="h-4 w-4 text-accent" />
                                        <span className="text-xs font-black text-text-primary uppercase tracking-wider">Project Updates</span>
                                    </div>
                                    <div className="space-y-3">
                                        {activity.projects.map((proj: any, idx: number) => (
                                            <div key={idx} className="border-l-2 border-accent/30 pl-3 py-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-tighter">ID: {proj.projectId.slice(-6)}</span>
                                                    <span className="text-[10px] font-black text-accent">{proj.hoursWorked} hrs</span>
                                                </div>
                                                <p className="text-xs text-text-primary/90 font-medium leading-relaxed">{proj.update}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
            <div className="text-text-secondary mb-0.5">{React.cloneElement(icon, { size: 12 })}</div>
            <span className="text-sm font-black text-text-primary tabular-nums">{value}</span>
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">{label}</span>
        </div>
    );
}

function DetailBox({ icon, value, label }: { icon: any, value: any, label: string }) {
    return (
        <div className="bg-hover-bg border border-border-color rounded-lg p-2 flex items-center gap-3">
            <div className="text-accent">{React.cloneElement(icon, { size: 12 })}</div>
            <div className="flex flex-col">
                <span className="text-xs font-black text-text-primary leading-none">{value}</span>
                <span className="text-[7px] text-text-secondary font-black tracking-widest mt-0.5">{label}</span>
            </div>
        </div>
    );
}

function ModalStatBox({ icon, value, label, accent = false }: { icon: any, value: any, label: string, accent?: boolean }) {
    return (
        <div className={`w-32 p-4 rounded-xl border backdrop-blur-xl flex flex-col items-center gap-1 shadow-2xl ${accent ? 'bg-accent/20 border-accent/40' : 'bg-bg-secondary/80 border-border-color'}`}>
            <div className={accent ? 'text-text-primary' : 'text-accent'}>{React.cloneElement(icon, { size: 18 })}</div>
            <span className="text-xl font-black text-text-primary tabular-nums">{value}</span>
            <span className={`text-[8px] font-black tracking-widest ${accent ? 'text-text-primary/60' : 'text-text-secondary'}`}>{label}</span>
        </div>
    );
}

function HoverStat({ icon, value, label }: { icon: any, value: any, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-accent/60">{React.cloneElement(icon, { size: 10 })}</div>
            <div className="min-w-0">
                <p className="text-[9px] font-bold text-text-primary leading-none">{value}</p>
                <p className="text-[7px] text-text-secondary uppercase tracking-tighter mt-0.5">{label}</p>
            </div>
        </div>
    )
}

function Stat({ icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex items-center gap-2">
            <div className="text-text-secondary">{React.cloneElement(icon, { size: 14 })}</div>
            <div>
                <p className="text-[10px] text-text-secondary font-medium tracking-tight uppercase">{label}</p>
                <p className="text-xs font-bold text-text-primary">{value || 0}</p>
            </div>
        </div>
    )
}

function SmallStat({ icon, value, label }: { icon: any, value: any, label: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-bg-primary/40 border border-border-color group-hover:bg-bg-primary/60 transition-colors">
            <div className="text-accent mb-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {React.cloneElement(icon, { size: 14 })}
            </div>
            <span className="text-xs font-bold text-text-primary leading-none">{value}</span>
            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1 group-hover:text-text-secondary transition-colors">{label}</span>
        </div>
    )
}

function formatUsageTime(seconds: number) {
    if (seconds === 0) return "0s";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
