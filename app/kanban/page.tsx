"use client";

import React, { useState, useEffect } from "react";

import { BoardProvider } from "@/components/kanban/BoardContext";
import Board from "@/components/kanban/Board";
import { 
    Search, 
    Filter, 
    Plus, 
    Settings, 
    Users, 
    ChevronDown, 
    LayoutGrid, 
    List, 
    Calendar,
    RefreshCcw,
    Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TaskModal from "@/components/tasks/TaskModal";
import ColumnSettingsModal from "@/components/kanban/ColumnSettingsModal";

export default function KanbanPage() {
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar">("kanban");
    const [loading, setLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [boardRefreshKey, setBoardRefreshKey] = useState(0); // Key to force BoardProvider re-render

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch("/api/projects");
                const data = await res.json();
                setProjects(data || []);
                if (data.length > 0) {
                    setSelectedProjectId(data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
                {/* Kanban Toolbar */}
                <div className="flex flex-col gap-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent/20 rounded-2xl border border-accent/30 text-accent">
                                <Zap className="h-6 w-6 shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-text-primary uppercase tracking-tighter">
                                    Kanban <span className="text-accent underline decoration-accent/30">Board</span>
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em]">
                                        Project Management
                                    </span>
                                    <div className="h-1 w-1 rounded-full bg-slate-700" />
                                    <div className="relative group">
                                        <button className="flex items-center gap-1.5 text-[10px] text-accent font-black uppercase tracking-widest hover:text-text-primary transition-colors">
                                            {selectedProject?.name || "Select Project"}
                                            <ChevronDown size={10} />
                                        </button>
                                        <div className="absolute top-full left-0 mt-2 w-56 p-2 bg-bg-secondary/90 backdrop-blur-xl border border-border-color rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                            {projects.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setSelectedProjectId(p.id)}
                                                    className="w-full text-left p-2 rounded-lg hover:bg-accent/10 text-[10px] font-bold text-text-primary uppercase tracking-widest transition-colors"
                                                >
                                                    {p.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex h-10 items-center gap-1 bg-bg-secondary/50 p-1 border border-border-color rounded-xl">
                                <button
                                    onClick={() => setViewMode("kanban")}
                                    className={`p-2 rounded-lg transition-all ${viewMode === "kanban" ? "bg-accent text-slate-950" : "text-text-secondary hover:text-text-primary"}`}
                                >
                                    <LayoutGrid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-accent text-slate-950" : "text-text-secondary hover:text-text-primary"}`}
                                >
                                    <List size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode("calendar")}
                                    className={`p-2 rounded-lg transition-all ${viewMode === "calendar" ? "bg-accent text-slate-950" : "text-text-secondary hover:text-text-primary"}`}
                                >
                                    <Calendar size={16} />
                                </button>
                            </div>

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-10 px-5 bg-accent hover:brightness-110 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-accent/20"
                            >
                                <Plus size={16} />
                                Create Task
                            </button>

                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-bg-secondary/50 border border-border-color text-text-secondary hover:text-text-primary transition-all"
                            >
                                <Settings size={18} />
                            </button>

                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-4 bg-bg-secondary/30 rounded-2xl border border-border-color backdrop-blur-sm">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search tasks by ID or title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 bg-black/40 border border-border-color rounded-xl text-xs font-bold text-text-primary placeholder:text-slate-600 focus:outline-none focus:border-accent/40 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3 overflow-hidden p-1">
                                {selectedProject?.members?.slice(0, 5).map((m: any) => (
                                    <img
                                        key={m.id}
                                        className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
                                        src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.name}`}
                                        alt={m.name}
                                    />
                                ))}
                                {selectedProject?.members?.length > 5 && (
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-slate-900 bg-card-bg text-[10px] font-bold text-text-secondary">
                                        +{selectedProject.members.length - 5}
                                    </div>
                                )}
                            </div>

                            <button className="h-10 px-4 bg-card-bg/50 hover:bg-card-bg rounded-xl border border-border-color text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Users size={14} />
                                Members
                            </button>

                            <button className="h-10 px-4 bg-card-bg/50 hover:bg-card-bg rounded-xl border border-border-color text-text-secondary hover:text-text-primary transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Filter size={14} />
                                Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Board Section */}
                <div className="flex-1 min-h-0 bg-bg-primary/20 rounded-[2.5rem] border border-border-color overflow-hidden">
                    {selectedProjectId ? (
                        <BoardProvider key={`${selectedProjectId}-${boardRefreshKey}`} projectId={selectedProjectId}>
                            {viewMode === "kanban" ? (
                                <Board onTaskClick={setSelectedTask} searchQuery={searchQuery} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-600 font-black uppercase tracking-widest italic opacity-20">
                                    {viewMode} View is coming soon
                                </div>
                            )}
                        </BoardProvider>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <RefreshCcw className="h-12 w-12 text-slate-800 animate-spin" />
                            <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Initializing Board...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <TaskModal 
                open={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onSaved={() => setIsCreateModalOpen(false)}
            />

            {selectedTask && (
                <TaskModal 
                    open={!!selectedTask} 
                    initial={selectedTask}
                    onClose={() => setSelectedTask(null)} 
                    onSaved={() => {
                        setSelectedTask(null);
                        setBoardRefreshKey(k => k + 1);
                    }}
                />
            )}

            {selectedProjectId && (
                <ColumnSettingsModal
                    open={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    projectId={selectedProjectId}
                    onUpdated={() => setBoardRefreshKey(k => k + 1)}
                />
            )}

        </div>
    );
}
