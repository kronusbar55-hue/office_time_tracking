"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";
import { ITask } from "@/models/Task";
import { Plus, MoreHorizontal, Loader2 } from "lucide-react";
import { useBoard } from "./BoardContext";

interface ColumnProps {
    id: string;
    title: string;
    tasks: any[];
    onTaskClick?: (task: any) => void;
}

const TaskSkeleton = () => (
    <div className="p-4 rounded-xl bg-border-color dark:bg-bg-secondary/30 border border-border-color animate-pulse h-32 w-full space-y-3">
        <div className="h-4 w-3/4 bg-card-bg/60 rounded" />
        <div className="h-3 w-1/2 bg-card-bg/40 rounded" />
        <div className="flex gap-2 pt-2">
            <div className="h-6 w-12 bg-card-bg/50 rounded-full" />
            <div className="h-6 w-12 bg-card-bg/50 rounded-full" />
        </div>
    </div>
);

export default function Column({ id, title, tasks, onTaskClick }: ColumnProps) {
    const { setNodeRef } = useDroppable({
        id: id,
    });
    const { loadMore, hasMore, loading } = useBoard();

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
            if (hasMore && !loading) {
                loadMore();
            }
        }
    };

    return (
        <div
            ref={setNodeRef}
            className="flex h-full w-80 min-w-[320px] flex-col rounded-xl bg-kanban-column-bg border border-card-border backdrop-blur-sm shadow-sm dark:shadow-sm transition-all duration-200"
        >
            <div className="flex items-center justify-between p-4 bg-card-hover/50 dark:bg-card-hover/30 rounded-t-xl border-b border-card-border transition-colors duration-200">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">{title}</h3>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card-bg dark:bg-bg-tertiary text-[10px] font-bold text-text-secondary transition-colors duration-200">
                        {loading && tasks.length === 0 ? "..." : tasks.length}
                    </span>
                </div>
                {/* ... existing buttons omitted for brevity in replace_file_content, will ensure they remain ... */}
                <div className="flex items-center gap-1">
                    <button className="h-8 w-8 rounded-lg hover:bg-hover-bg dark:hover:bg-hover-bg flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200">
                        <Plus className="h-4 w-4" />
                    </button>
                    <button className="h-8 w-8 rounded-lg hover:bg-hover-bg dark:hover:bg-hover-bg flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div 
                className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
                onScroll={handleScroll}
            >
                {loading && tasks.length === 0 ? (
                    <div className="space-y-3">
                        <TaskSkeleton />
                        <TaskSkeleton />
                        <TaskSkeleton />
                    </div>
                ) : (
                    <>
                        <SortableContext items={tasks.map((t) => (t._id || t.id).toString())} strategy={verticalListSortingStrategy}>
                            {tasks.map((task) => (
                                <TaskCard key={(task._id || task.id).toString()} task={task} onClick={onTaskClick} />
                            ))}
                        </SortableContext>

                        {loading && hasMore && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                                <span className="ml-2 text-[10px] font-bold text-text-secondary uppercase">Loading more...</span>
                            </div>
                        )}

                        {!hasMore && tasks.length > 0 && (
                            <div className="text-center py-4 opacity-30">
                                <span className="text-[8px] font-black text-text-secondary uppercase tracking-[3px]">End of list</span>
                            </div>
                        )}

                        {tasks.length === 0 && !loading && (
                            <div className="h-20 rounded-xl border-2 border-dashed border-border-color flex items-center justify-center opacity-20">
                                <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest">Empty</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
