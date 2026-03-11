"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";
import { ITask } from "@/models/Task";
import { Plus, MoreHorizontal } from "lucide-react";

interface ColumnProps {
    id: string;
    title: string;
    tasks: any[];
    onTaskClick?: (task: any) => void;
}

export default function Column({ id, title, tasks, onTaskClick }: ColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    });

    return (
        <div
            ref={setNodeRef}
            className="flex h-full w-80 min-w-[320px] flex-col rounded-xl bg-slate-900/40 border border-white/5 backdrop-blur-sm"
        >
            <div className="flex items-center justify-between p-4 bg-slate-900/20 rounded-t-xl border-b border-white/5">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-400">
                        {tasks.length}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors">
                        <Plus className="h-4 w-4" />
                    </button>
                    <button className="h-8 w-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                <SortableContext items={tasks.map((t) => t._id.toString())} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskCard key={task._id.toString()} task={task} onClick={onTaskClick} />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="h-20 rounded-xl border-2 border-dashed border-white/5 flex items-center justify-center opacity-20">
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Empty</span>
                    </div>
                )}
            </div>
        </div>
    );
}
