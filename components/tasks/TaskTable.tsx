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
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-md bg-slate-800/40" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="mt-6 rounded-md border border-slate-700/40 p-6 text-center text-sm text-slate-400">No tasks found.</div>
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
        <thead className="sticky top-0 bg-slate-900/60 backdrop-blur">
          <tr className="text-left text-slate-300">
            <th className="px-3 py-2">Key</th>
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
            const due = t.dueDate ? new Date(t.dueDate) : null;
            const overdue = due && due.getTime() < Date.now();
            return (
              <tr key={t._id} className="border-t border-slate-800/40 hover:bg-slate-800/30">
                <td className="px-3 py-2 align-top">{t.key}</td>
                <td className="px-3 py-2 align-top">
                  <a href={`/tasks/${t._id}`} className="text-sky-400 hover:underline">{t.title}</a>
                </td>
                <td className="px-3 py-2 align-top">{t.type}</td>
                <td className="px-3 py-2 align-top">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium text-slate-900 ${priorityColor(t.priority)}`}>{t.priority}</span>
                </td>
                <td className="px-3 py-2 align-top">
                  <select defaultValue={t.status} onChange={(e) => handleStatusChange(t._id, e.target.value)} className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-sm text-slate-100">
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </td>
                <td className="px-3 py-2 align-top">
                  {t.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 flex-shrink-0 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-white">{(t.assignee.firstName?.[0] || "?") + (t.assignee.lastName?.[0] || "")}</div>
                      <div className="text-xs">{t.assignee.firstName} {t.assignee.lastName}</div>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {due ? (
                    <span className={`text-xs ${overdue ? 'text-rose-400' : 'text-slate-300'}`}>{due.toLocaleDateString()}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-3">
                    <a href={`/tasks/${t._id}`} className="text-slate-300 hover:text-slate-100">View</a>
                    {user?.role !== "employee" && (
                      <>
                        <a href={`/tasks/${t._id}/edit`} className="text-sky-400 hover:brightness-110">Edit</a>
                        <button onClick={() => handleDelete(t)} disabled={deleting === t._id} className="text-rose-400 hover:brightness-110 disabled:opacity-50">
                          {deleting === t._id ? "Deleting..." : "Delete"}
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
