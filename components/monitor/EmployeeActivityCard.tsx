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
}

export default function EmployeeActivityCard({ employee, viewMode }: EmployeeActivityCardProps) {
    const [isZoomed, setIsZoomed] = useState(false);
    const { activity } = employee;

    // Status color logic (simulated idle)
    const isActive = activity ? (activity.activeSeconds > activity.idleSeconds) : false;
    const statusLabel = activity?.status || (activity ? (isActive ? "Active" : "Idle") : "Offline");

    const getStatusColor = (label: string) => {
        const l = label.toLowerCase();
        if (l === 'active' || l === 'online') return "text-green-400 bg-green-400/10";
        if (l === 'break') return "text-orange-400 bg-orange-400/10";
        if (l === 'meeting') return "text-purple-400 bg-purple-400/10";
        if (l === 'offline') return "text-slate-500 bg-slate-500/10";
        return "text-yellow-400 bg-yellow-400/10";
    };

    const statusColor = getStatusColor(statusLabel);

    if (viewMode === "list") {
        return (
            <div className="flex items-center gap-6 p-4 rounded-2xl bg-slate-900/40 border border-white/5 hover:bg-slate-900/60 transition-all backdrop-blur-sm group">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent text-sm font-bold uppercase shadow-inner">
                        {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                    </div>
                </div>

                <div className="flex-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-accent transition-colors">
                        {employee.firstName} {employee.lastName}
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
                        {employee.userId || "No ID"}
                    </p>
                </div>

                {activity && (
                    <>
                        <div className="flex items-center gap-8">
                            <Stat icon={<MousePointer2 />} label="Clicks" value={activity.mouseClicks} />
                            <Stat icon={<Move />} label="Moves" value={activity.mouseMovements} />
                            <Stat icon={<Type />} label="Keys" value={activity.keyPresses} />
                            <Stat icon={<Clock />} label="Session" value={activity.sessionTime || "00:00"} />
                            <Stat icon={<Clock />} label="Break" value={activity.breakTime || "00:00"} />
                            <Stat icon={<Clock />} label="Meeting" value={activity.meetingTime || "00:00"} />
                        </div>

                        <div className="flex flex-col items-end gap-1 px-8 border-l border-white/5">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <Clock className="h-3 w-3" />
                                {activity.time}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <Globe className="h-3 w-3" />
                                {activity.timezone || "N/A"}
                            </div>
                        </div>
                    </>
                )}

                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                    {statusLabel}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden group hover:border-accent/30 transition-all hover:shadow-[0_0_30px_-10px_rgba(var(--accent-rgb),0.3)] backdrop-blur-md">
                {/* Header - Compact */}
                <div className="p-3 flex items-center justify-between border-b border-white/5 bg-slate-900/40">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 border border-white/10 flex items-center justify-center text-accent text-[10px] font-bold uppercase">
                            {employee.firstName?.charAt(0)}{employee.lastName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]" title={`${employee.firstName} ${employee.lastName}`}>
                                {employee.firstName} {employee.lastName}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className={`h-1 w-1 rounded-full ${statusColor.includes('green') ? 'bg-green-400' : statusColor.includes('orange') ? 'bg-orange-400' : statusColor.includes('purple') ? 'bg-purple-400' : 'bg-yellow-400'}`} />
                                <span className={`text-[8px] font-bold uppercase tracking-wider ${statusColor.split(' ')[0]}`}>
                                    {statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content / Screenshot Container - Smaller aspect */}
                <div className="relative aspect-[4/3] w-full bg-slate-950 overflow-hidden cursor-zoom-in group/img" onClick={() => setIsZoomed(true)}>
                    {activity?.imageUrl ? (
                        <>
                            <img
                                src={activity.imageUrl}
                                alt="Screen"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500"
                            />

                            {/* Hover Overlay with Stats */}
                            <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm flex flex-col p-3 justify-center">
                                <div className="grid grid-cols-2 gap-2">
                                    <HoverStat icon={<MousePointer2 />} value={activity?.mouseClicks || 0} label="Clicks" />
                                    <HoverStat icon={<Type />} value={activity?.keyPresses || 0} label="Keys" />
                                    <HoverStat icon={<Move />} value={activity?.mouseMovements || 0} label="Moves" />
                                    <HoverStat icon={<Clock />} value={activity?.sessionTime || "0:0"} label="Session" />
                                </div>

                                {activity?.appUsage && Object.keys(activity.appUsage).length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-white/10">
                                        <div className="flex flex-wrap gap-1 max-h-[40px] overflow-hidden">
                                            {Object.entries(activity.appUsage)
                                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                                .slice(0, 2)
                                                .map(([appName, duration]) => (
                                                    <div key={appName} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] text-slate-300 truncate max-w-full">
                                                        {appName}: <span className="text-accent">{Math.round(duration as number)}m</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="absolute bottom-2 left-2 pointer-events-none group-hover:opacity-0 transition-opacity">
                                <div className="backdrop-blur-md bg-black/40 border border-white/5 rounded px-1.5 py-0.5 flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5 text-accent" />
                                    <span className="text-[8px] font-medium text-white">{activity.time}</span>
                                </div>
                            </div>

                            <div className="absolute top-2 right-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                <div className="h-6 w-6 rounded-md bg-accent text-slate-950 flex items-center justify-center shadow-lg">
                                    <Maximize2 className="h-3 w-3" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-800">
                            <Monitor className="h-8 w-8 mb-2 opacity-20" />
                            <span className="text-[8px] font-bold uppercase tracking-widest">No Capture</span>
                        </div>
                    )}
                </div>

                {/* Footer - Minimal */}
                <div className="px-3 py-2 flex items-center justify-between bg-slate-900/20 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-tight">
                        <Clock className="h-2.5 w-2.5" />
                        {activity ? formatDistanceToNow(new Date(), { addSuffix: false }) : "N/A"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase tracking-tight">
                        <Globe className="h-2.5 w-2.5" />
                        {activity?.timezone?.split('/')[1] || "UTC"}
                    </div>
                </div>
            </div>

            {/* Zoom Modal */}
            {isZoomed && activity && (
                <div
                    className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-8 cursor-zoom-out animate-in fade-in zoom-in duration-300"
                    onClick={() => setIsZoomed(false)}
                >
                    <div className="relative max-w-6xl w-full aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_100px_-20px_rgba(0,0,0,0.8)]">
                        <img src={activity.imageUrl} alt="Zoomed" className="w-full h-full object-contain" />
                        <div className="absolute bottom-8 left-8 flex flex-col gap-2">
                            <h2 className="text-2xl font-bold text-white shadow-xl">{employee.firstName} {employee.lastName}</h2>
                            <div className="flex items-center gap-4 text-slate-300 uppercase tracking-widest text-[10px] font-bold">
                                <span className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
                                    <Clock className="h-3 w-3 text-accent" /> {activity.time}
                                </span>
                                <span className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
                                    <Globe className="h-3 w-3 text-accent" /> {activity.timezone}
                                </span>
                            </div>
                        </div>
                        <button className="absolute top-8 right-8 h-12 w-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                            <Maximize2 className="h-6 w-6 rotate-180" />
                        </button>
                    </div>
                </div>
            )}
        </>
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
