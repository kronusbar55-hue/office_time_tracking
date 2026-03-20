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
          <h3 className="text-sm font-semibold text-text-primary">Task Details</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">Close</button>
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            <div className="h-6 w-3/4 animate-pulse rounded bg-card-bg/40" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-card-bg/40" />
            <div className="h-24 animate-pulse rounded bg-card-bg/40" />
          </div>
        ) : task ? (
          <div className="mt-4 space-y-3 text-sm text-text-primary">
            <div className="font-medium text-text-primary">{task.key} — {task.title}</div>
            <div className="text-text-secondary">{task.project?.name}</div>
            {task.description ? (
              <div 
                className="mt-2 prose prose-invert prose-sm max-w-none text-text-secondary"
                dangerouslySetInnerHTML={{ __html: task.description }}
              />
            ) : (
              <div className="mt-2 text-text-secondary italic">No description</div>
            )}
            <div className="mt-3 text-xs text-text-secondary">Assignee: {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "—"}</div>
            <div className="text-xs text-text-secondary">Priority: {task.priority}</div>
            <div className="text-xs text-text-secondary">Status: {task.status}</div>
            <div className="text-xs text-text-secondary">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}</div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-text-secondary">Task not found</div>
        )}
      </div>
    </div>
  );
}
