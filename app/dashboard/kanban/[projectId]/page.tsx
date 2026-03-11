"use client";

import React, { useState } from "react";
import Board from "@/components/kanban/Board";
import { BoardProvider } from "@/components/kanban/BoardContext";
import { Filter, Search, Plus, Settings, Users, Layers, Layout } from "lucide-react";
import TaskModal from "@/components/tasks/TaskModal";
import { useBoard } from "@/components/kanban/BoardContext";

export default function KanbanPage({ params }: { params: { projectId: string } }) {
    return (
        <BoardProvider projectId={params.projectId}>
            <KanbanContent projectId={params.projectId} />
        </BoardProvider>
    );
}

function KanbanContent({ projectId }: { projectId: string }) {
    const { refreshTasks } = useBoard();
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);

    const handleCreateClick = () => {
        setSelectedTask({ project: { _id: projectId } });
        setIsModalOpen(true);
    };

    const handleTaskClick = (task: any) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-100">
            {/* Kanban Header */}
            <div className="flex flex-col gap-6 p-8 pb-4 border-b border-white/5 bg-slate-900/20 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                            <Layout size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Kanban <span className="text-accent">Board</span></h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Project Board</span>
                                <div className="h-1 w-1 rounded-full bg-slate-700" />
                                <span className="text-[10px] font-bold text-accent uppercase tracking-widest underline cursor-pointer">Project Settings</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-bold">
                            <Users size={16} />
                            <span>Members</span>
                        </button>
                        <button 
                            onClick={handleCreateClick}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-all text-sm font-black shadow-lg shadow-accent/20"
                        >
                            <Plus size={18} />
                            <span>Create Task</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                className="pl-9 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-accent/40 w-64 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent transition-all">
                                    <img src={`https://ui-avatars.com/api/?name=User+${i}&background=random`} alt="user" />
                                </div>
                            ))}
                            <button className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
                            <Filter size={18} />
                        </button>
                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
                            <Layers size={18} />
                        </button>
                        <div className="w-px h-6 bg-white/10 mx-1" />
                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors">
                            <Settings size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-hidden">
                <Board onTaskClick={handleTaskClick} searchQuery={searchQuery} />
            </div>

            <TaskModal 
                open={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTask(null);
                }} 
                onSaved={() => refreshTasks()}
                initial={selectedTask}
            />
        </div>
    );
}
