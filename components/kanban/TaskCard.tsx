"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ITask } from "@/models/Task";
import {
    Clock,
    MessageSquare,
    Paperclip,
    Layers,
    ArrowUpCircle,
    AlertCircle,
    PlayCircle
} from "lucide-react";

interface TaskCardProps {
    task: any;
    isOverlay?: boolean;
    onClick?: (task: any) => void;
}

const getPriorityIcon = (priority: string) => {
    switch (priority) {
        case "HIGHEST": return <AlertCircle className="h-3 w-3 text-rose-500" />;
        case "HIGH": return <ArrowUpCircle className="h-3 w-3 text-orange-500" />;
        case "MEDIUM": return <PlayCircle className="h-3 w-3 text-blue-500" />;
        default: return <Clock className="h-3 w-3 text-slate-500" />;
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
        case "BUG": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
        case "STORY": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
        case "EPIC": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
        default: return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    }
};

export default function TaskCard({ task, isOverlay, onClick }: TaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task._id.toString() });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="h-28 rounded-xl bg-slate-900/50 border-2 border-dashed border-accent/30 opacity-40 shadow-xl"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick?.(task)}
            className={`group relative rounded-xl bg-slate-800/80 border border-white/5 p-4 transition-all hover:border-accent/40 hover:bg-slate-800 shadow-lg cursor-pointer active:cursor-grabbing ${isOverlay ? "ring-2 ring-accent/50 shadow-2xl scale-105" : ""
                }`}
        >
            <div className="flex flex-col gap-3">
                {/* Header: Key & Type */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getTypeColor(task.type)}`}>
                            {task.type}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{task.key}</span>
                    </div>
                    <div className="h-6 w-6 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center overflow-hidden">
                        {task.assignee ? (
                            <img
                                src={task.assignee.avatarUrl || `https://ui-avatars.com/api/?name=${task.assignee.firstName}`}
                                alt="Assignee"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full bg-slate-800 flex items-center justify-center">
                                <span className="text-[8px] text-slate-600 font-bold uppercase">UN</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-white leading-tight group-hover:text-accent transition-colors">
                    {task.title}
                </h4>

                {/* Footer: Stats & Priority */}
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-[10px] font-black tabular-nums">{task.commentCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                            <Paperclip className="h-3 w-3" />
                            <span className="text-[10px] font-black tabular-nums">{task.attachmentCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 group-hover:text-slate-400 transition-colors">
                            <Layers className="h-3 w-3" />
                            <span className="text-[10px] font-black tabular-nums">{task.subtaskStats?.done || 0}/{task.subtaskStats?.total || 0}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {task.storyPoints > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 border border-accent/30 text-[9px] font-black text-white tabular-nums">
                                {task.storyPoints}
                            </span>
                        )}
                        <div className="h-6 w-6 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center">
                            {getPriorityIcon(task.priority)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
