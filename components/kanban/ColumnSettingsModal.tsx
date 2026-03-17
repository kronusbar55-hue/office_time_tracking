"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, GripVertical, Save } from "lucide-react";
import { toast } from "react-toastify";

interface ColumnSettingsModalProps {
    open: boolean;
    onClose: () => void;
    projectId: string;
    onUpdated: () => void;
}

export default function ColumnSettingsModal({ open, onClose, projectId, onUpdated }: ColumnSettingsModalProps) {
    const [columns, setColumns] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState("");

    const fetchColumns = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/columns?project=${projectId}`);
            const json = await res.json();
            if (json.data) setColumns(json.data);
        } catch (error) {
            toast.error("Failed to load columns");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && projectId) fetchColumns();
    }, [open, projectId]);

    const handleAdd = async () => {
        if (!newName.trim()) return;
        try {
            const res = await fetch("/api/columns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project: projectId,
                    name: newName.trim(),
                    category: "todo",
                    sortOrder: columns.length
                })
            });
            if (res.ok) {
                setNewName("");
                fetchColumns();
                toast.success("Column added");
            }
        } catch (e) {
            toast.error("Failed to add column");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? Tasks in this status might become hidden.")) return;
        try {
            const res = await fetch(`/api/columns/${id}`, { method: "DELETE" });
            if (res.ok) {
                setColumns(prev => prev.filter(c => c._id !== id));
                toast.success("Column deleted");
            }
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const handleUpdate = async (id: string, name: string) => {
        try {
            await fetch(`/api/columns/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });
            toast.success("Updated");
        } catch (e) {
            toast.error("Failed update");
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Board Columns</h3>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">Manage your workflow status</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {columns.map((c) => (
                        <div key={c._id} className="flex items-center gap-3 p-4 bg-black/20 border border-white/5 rounded-2xl">
                            <GripVertical className="text-slate-600 shrink-0" size={18} />
                            <input 
                                defaultValue={c.name} 
                                onBlur={(e) => handleUpdate(c._id, e.target.value)}
                                className="bg-transparent text-sm font-bold text-white focus:outline-none flex-1"
                            />
                            <button onClick={() => handleDelete(c._id)} className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input 
                        placeholder="New column name..." 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 h-12 bg-black/40 border border-white/5 rounded-2xl px-4 text-sm font-bold text-white focus:border-accent/40 focus:outline-none"
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!newName.trim()}
                        className="h-12 w-12 flex items-center justify-center bg-accent text-slate-950 rounded-2xl shadow-lg shadow-accent/20 disabled:opacity-50"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <button 
                    onClick={() => { onUpdated(); onClose(); }}
                    className="w-full mt-8 h-12 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
