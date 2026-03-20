"use client";

import React, { useState, useEffect } from "react";
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
    const { refreshTasks, assigneeFilter, setAssigneeFilter } = useBoard();
    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [project, setProject] = useState<any>(null);

    // Fetch project to get members
    useEffect(() => {
        async function fetchProject() {
            try {
                const res = await fetch(`/api/projects?forCurrentUser=true`);
                if (res.ok) {
                    const projects = await res.json();
                    const p = projects.find((p: any) => p.id === projectId);
                    if (p) setProject(p);
                }
            } catch (err) {
                console.error("Failed to fetch project members:", err);
            }
        }
        fetchProject();
    }, [projectId]);

    const handleCreateClick = () => {
        setSelectedTask({ project: { _id: projectId } });
        setIsModalOpen(true);
    };

    const handleTaskClick = (task: any) => {
        setSelectedTask(task);
        setIsModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full bg-bg-primary text-text-primary">
            {/* Kanban Header */}
            <div className="flex flex-col gap-6 p-8 pb-4 border-b border-border-color bg-bg-secondary/20 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                            <Layout size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-text-primary tracking-tighter uppercase">{project?.name || 'Kanban'} <span className="text-accent">Board</span></h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{project?.clientName || 'Active Project Board'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hover-bg border border-border-color text-text-secondary hover:bg-hover-bg transition-all text-sm font-bold opacity-60">
                            <Users size={16} />
                            <span>{project?.members?.length || 0} Members</span>
                        </button>
                        <button
                            onClick={handleCreateClick}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-accent text-text-primary hover:bg-accent-hover transition-all text-sm font-black shadow-lg shadow-accent/20"
                        >
                            <Plus size={18} />
                            <span>Create Task</span>
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={14} />
                            <input
                                type="text"
                                placeholder="Search tasks..."
                                className="pl-9 pr-4 py-2 bg-bg-secondary/50 border border-border-color rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-accent/40 w-64 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-text-secondary uppercase tracking-[2px]">Team Filter</span>
                            <div className="flex items-center -space-x-2">
                                <button 
                                    onClick={() => setAssigneeFilter("all")}
                                    className={`h-8 px-3 rounded-full border-2 transition-all text-[10px] font-black uppercase tracking-tighter ${assigneeFilter === "all" ? 'bg-accent border-accent text-text-primary shadow-lg shadow-accent/30' : 'bg-bg-secondary border-border-color text-text-secondary hover:border-slate-500'}`}
                                >
                                    All
                                </button>
                                {project?.members?.map((m: any) => (
                                    <div 
                                        key={m.id} 
                                        title={m.name}
                                        onClick={() => setAssigneeFilter(m.id)}
                                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center overflow-hidden cursor-pointer transition-all relative group ${assigneeFilter === m.id ? 'border-accent ring-4 ring-accent/20 z-10 scale-110' : 'border-border-color hover:border-border-color hover:z-10'}`}
                                    >
                                        <div className={`absolute inset-0 bg-accent/20 transition-opacity ${assigneeFilter === m.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                                        {m.avatarUrl ? (
                                            <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-text-primary uppercase">{m.firstName?.[0]}{m.lastName?.[0]}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {assigneeFilter !== "all" && (
                                <span className="text-[10px] font-bold text-accent animate-in slide-in-from-left-2 fade-in">
                                    Viewing {project?.members?.find((m: any) => m.id === assigneeFilter)?.name}&apos;s tasks
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-hover-bg border border-border-color text-text-secondary hover:text-text-primary transition-colors">
                            <Filter size={18} />
                        </button>
                        <button className="p-2 rounded-lg bg-hover-bg border border-border-color text-text-secondary hover:text-text-primary transition-colors">
                            <Layers size={18} />
                        </button>
                        <div className="w-px h-6 bg-hover-bg mx-1" />
                        <button className="p-2 rounded-lg bg-hover-bg border border-border-color text-text-secondary hover:text-text-primary transition-colors">
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
