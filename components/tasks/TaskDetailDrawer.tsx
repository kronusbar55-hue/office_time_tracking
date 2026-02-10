"use client";

import { useEffect, useState } from "react";

export default function TaskDetailDrawer({ open, taskId, onClose }: { open: boolean; taskId?: string | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<any | null>(null);

  useEffect(() => {
    if (!open || !taskId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (res.ok) {
          const json = await res.json();
          if (mounted) setTask(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, taskId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-[520px] bg-card/95 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-50">Task Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">Close</button>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            <div className="h-6 w-3/4 animate-pulse rounded bg-slate-800/40" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800/40" />
            <div className="h-24 animate-pulse rounded bg-slate-800/40" />
          </div>
        ) : task ? (
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            <div className="font-medium text-slate-100">{task.key} — {task.title}</div>
            <div className="text-slate-400">{task.project?.name}</div>
            <div className="mt-2 whitespace-pre-wrap">{task.description || "No description"}</div>
            <div className="mt-3 text-xs text-slate-300">Assignee: {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "—"}</div>
            <div className="text-xs text-slate-300">Priority: {task.priority}</div>
            <div className="text-xs text-slate-300">Status: {task.status}</div>
            <div className="text-xs text-slate-300">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-400">Task not found</div>
        )}
      </div>
    </div>
  );
}
