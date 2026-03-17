"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "react-toastify";

interface SubtaskListProps {
    taskId: string;
}

export default function SubtaskList({ taskId }: SubtaskListProps) {
    const [subtasks, setSubtasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const fetchSubtasks = async () => {
        try {
            const res = await fetch(`/api/subtasks?parentTask=${taskId}`);
            const json = await res.json();
            if (json.data) setSubtasks(json.data);
        } catch (error) {
            console.error("Failed to fetch subtasks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubtasks();
    }, [taskId]);

    const handleAddSubtask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        try {
            setIsAdding(true);
            const res = await fetch("/api/subtasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentTask: taskId,
                    title: newSubtaskTitle.trim()
                }),
            });
            if (res.ok) {
                setNewSubtaskTitle("");
                fetchSubtasks();
                toast.success("Subtask added");
            }
        } catch (error) {
            toast.error("Failed to add subtask");
        } finally {
            setIsAdding(false);
        }
    };

    const toggleSubtask = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "done" ? "todo" : "done";
        try {
            // Optimistic update
            setSubtasks(prev => prev.map(s => s._id === id ? { ...s, status: newStatus } : s));
            
            await fetch(`/api/subtasks/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (error) {
            toast.error("Failed to update subtask");
            fetchSubtasks();
        }
    };

    const deleteSubtask = async (id: string) => {
        if (!confirm("Delete this subtask?")) return;
        try {
            const res = await fetch(`/api/subtasks/${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setSubtasks(prev => prev.filter(s => s._id !== id));
                toast.success("Subtask deleted");
            }
        } catch (error) {
            toast.error("Failed to delete subtask");
        }
    };

    const progress = subtasks.length > 0 
        ? Math.round((subtasks.filter(s => s.status === "done").length / subtasks.length) * 100)
        : 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    Subtasks
                    <span className="text-accent">({subtasks.length})</span>
                </h4>
                {subtasks.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 transition-all duration-500" 
                                style={{ width: `${progress}%` }} 
                            />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 tabular-nums">{progress}%</span>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                {subtasks.map((s) => (
                    <div 
                        key={s._id} 
                        className="group flex items-center justify-between p-3 bg-slate-900/40 border border-white/5 rounded-xl hover:border-white/10 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => toggleSubtask(s._id, s.status)}
                                className={`transition-colors ${s.status === "done" ? "text-emerald-500" : "text-slate-500 hover:text-white"}`}
                            >
                                {s.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                            <span className={`text-sm font-bold ${s.status === "done" ? "text-slate-500 line-through" : "text-white"}`}>
                                {s.title}
                            </span>
                        </div>
                        <button 
                            onClick={() => deleteSubtask(s._id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddSubtask} className="flex gap-2">
                <input
                    type="text"
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 h-10 px-4 bg-black/40 border border-white/5 rounded-xl text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-accent/40 transition-colors"
                />
                <button
                    type="submit"
                    disabled={isAdding || !newSubtaskTitle.trim()}
                    className="h-10 px-4 bg-accent/20 border border-accent/40 rounded-xl text-accent hover:bg-accent hover:text-slate-950 transition-all disabled:opacity-50"
                >
                    <Plus size={16} />
                </button>
            </form>
        </div>
    );
}
