"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function TaskTable({ tasks, loading, onDelete, onStatusChange, user }: {
  tasks: any[];
  loading: boolean;
  onDelete: (task: any) => void;
  onStatusChange: (taskId: string, status: string) => void;
  user?: any;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (task: any) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) return;
    
    setDeleting(task._id);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      toast.success("Task deleted successfully!");
      onDelete(task);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setDeleting(null);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!taskId || taskId === "undefined") {
      console.error("Attempted to update status with undefined taskId");
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Status updated successfully!");
      onStatusChange(taskId, newStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="mt-4 overflow-x-auto border border-border-color rounded-2xl bg-bg-secondary/40">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-color bg-bg-secondary/60 transition-colors">
              {['Key', 'Project', 'Title', 'Type', 'Priority', 'Status', 'Assignee', 'Due', 'Actions'].map((h) => (
                <th key={h} className="px-3 py-3 font-black text-[10px] uppercase tracking-[2px] text-text-secondary">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border-color animate-pulse">
                <td className="px-3 py-4"><div className="h-4 w-12 rounded-lg bg-card-bg" /></td>
                <td className="px-3 py-4"><div className="h-5 w-24 rounded-lg bg-card-bg/60" /></td>
                <td className="px-3 py-4"><div className="h-5 w-48 rounded-lg bg-hover-bg" /></td>
                <td className="px-3 py-4"><div className="h-4 w-16 rounded-lg bg-card-bg/60" /></td>
                <td className="px-3 py-4"><div className="h-6 w-20 rounded-full bg-card-bg/80" /></td>
                <td className="px-3 py-4"><div className="h-8 w-24 rounded-xl bg-card-bg/40" /></td>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-card-bg" />
                    <div className="h-3 w-16 rounded bg-card-bg/60" />
                  </div>
                </td>
                <td className="px-3 py-4"><div className="h-4 w-16 rounded-lg bg-card-bg/60" /></td>
                <td className="px-3 py-4"><div className="h-4 w-20 rounded-lg bg-card-bg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-border-color/40 p-6 text-center text-sm text-text-secondary">No tasks found.</div>
    );
  }

  const priorityColor = (p: string) => {
    switch (p) {
      case "High": return "bg-rose-500";
      case "Medium": return "bg-amber-500";
      case "Low": return "bg-emerald-500";
      default: return "bg-slate-600";
    }
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full table-auto text-sm">
        <thead className="sticky top-0 bg-bg-secondary/60 backdrop-blur">
          <tr className="text-left text-text-secondary">
            <th className="px-3 py-2">Key</th>
            <th className="px-3 py-2">Project</th>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Priority</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Assignee</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const taskId = t._id || t.id;
            const due = t.dueDate ? new Date(t.dueDate) : null;
            const overdue = due && due.getTime() < Date.now();
            return (
              <tr key={taskId} className="border-t border-border-color/40 hover:bg-card-bg/30">
                <td className="px-3 py-2 align-top text-text-secondary font-mono tracking-tighter uppercase">{t.key}</td>
                <td className="px-3 py-2 align-top">
                   <span className="text-[10px] font-black uppercase text-text-secondary border border-border-color bg-card-bg/20 px-1.5 py-0.5 rounded shadow-sm">
                      {t.project?.name || "Global"}
                   </span>
                </td>
                <td className="px-3 py-2 align-top">
                  <a href={`/tasks/${t._id}`} className="text-sky-400 hover:underline font-bold">{t.title}</a>
                </td>
                <td className="px-3 py-2 align-top">{t.type}</td>
                <td className="px-3 py-2 align-top">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium text-slate-900 ${priorityColor(t.priority)}`}>{t.priority}</span>
                </td>
                <td className="px-3 py-2 align-top">
                  <select value={t.status} onChange={(e) => handleStatusChange(taskId, e.target.value)} className="rounded-md border border-border-color bg-bg-primary/60 px-2 py-1 text-xs text-text-primary font-bold">
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="qa">QA</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  {t.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 flex-shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-text-primary">{(t.assignee.firstName?.[0] || "?") + (t.assignee.lastName?.[0] || "")}</div>
                      <div className="text-xs">{t.assignee.firstName} {t.assignee.lastName}</div>
                    </div>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {due ? (
                    <span className={`text-xs ${overdue ? 'text-rose-400' : 'text-text-secondary'}`}>{due.toLocaleDateString()}</span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-3">
                    <a href={`/tasks/${taskId}`} className="text-text-secondary hover:text-text-primary">View</a>
                    {user?.role !== "employee" && (
                      <>
                        <a href={`/tasks/${taskId}/edit`} className="text-sky-400 hover:brightness-110">Edit</a>
                        <button onClick={() => handleDelete(t)} disabled={deleting === taskId} className="text-rose-400 hover:brightness-110 disabled:opacity-50">
                          {deleting === taskId ? "Deleting..." : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
