"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Upload } from "lucide-react";
import { toast } from "react-toastify";
import ActivityTimeline from "@/components/tasks/ActivityTimeline";
import ImageGallery from "@/components/tasks/ImageGallery";
import { useAuth } from "@/components/auth/AuthProvider";

export default function TaskViewPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [newAssignee, setNewAssignee] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [deletingAttachments, setDeletingAttachments] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [taskRes, projRes] = await Promise.all([
          fetch(`/api/tasks/${taskId}`),
          fetch("/api/projects")
        ]);

        if (taskRes.ok) {
          const taskData = await taskRes.json();
          setTask(taskData.data);
          setNewAssignee(taskData.data?.assignee?._id || null);
          setNewStatus(taskData.data?.status || "backlog");

          // Load project members for assignee filter
          if (taskData.data?.project && projRes.ok) {
            const projectsData = await projRes.json();
            const projectMembers = projectsData.find((p: any) => p.id === taskData.data.project._id)?.members || [];
            setUsers(projectMembers);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load task");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [taskId]);

  const isEmployee = user?.role === "employee";
  const canFullEdit = user?.role === "admin" || user?.role === "manager";
  const canDeleteAttachments = user?.role === "admin" || user?.role === "manager";

  async function handleUpdate() {
    if (!task) return;

    const updates: any = {};
    if (newAssignee !== task.assignee?._id) {
      updates.assignee = newAssignee || undefined;
    }
    if (newStatus !== task.status) {
      updates.status = newStatus;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes made");
      return;
    }

    try {
      setUpdating(true);
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });

      if (!res.ok) throw new Error("Failed to update task");

      const data = await res.json();
      setTask(data.data);
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update task");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingAttachments(true);
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload attachments");
      }

      const data = await res.json();
      
      // Update task with new attachments
      setTask((prev: any) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...data.data]
      }));

      toast.success(`Successfully uploaded ${data.data.length} image(s)`);
      
      // Reset file input
      if (e.target) {
        e.target.value = "";
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to upload attachments");
    } finally {
      setUploadingAttachments(false);
    }
  }

  async function handleDeleteAttachment(publicId: string) {
    try {
      setDeletingAttachments((prev) => new Set(prev).add(publicId));

      const res = await fetch(
        `/api/tasks/${taskId}/attachments?publicId=${encodeURIComponent(publicId)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error("Failed to delete attachment");
      }

      // Update task by removing attachment
      setTask((prev: any) => ({
        ...prev,
        attachments: prev.attachments?.filter(
          (a: any) => a.publicId !== publicId
        )
      }));

      toast.success("Attachment deleted successfully");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to delete attachment");
    } finally {
      setDeletingAttachments((prev) => {
        const next = new Set(prev);
        next.delete(publicId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          <div className="h-6 w-1/2 animate-pulse rounded bg-slate-800/40" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800/40" />
          <div className="mt-6 h-32 animate-pulse rounded bg-slate-800/40" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-center text-slate-400">Task not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-200">
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      {/* Task Header */}
      <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">{task.key} — {task.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{task.project?.name}</p>
          </div>
          {canFullEdit && (
            <button
              onClick={() => router.push(`/tasks/${taskId}/edit`)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-900 hover:brightness-95"
            >
              Edit
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-slate-400 uppercase">Type</div>
            <div className="mt-1 text-sm text-slate-200">{task.type}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase">Priority</div>
            <div className="mt-1 text-sm text-slate-200">{task.priority}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase">Due Date</div>
            <div className="mt-1 text-sm text-slate-200">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase">Reporter</div>
            <div className="mt-1 text-sm text-slate-200">
              {task.reporter ? `${task.reporter.firstName} ${task.reporter.lastName}` : "—"}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800/40 pt-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Description</h3>
          <div className="whitespace-pre-wrap text-sm text-slate-300">
            {task.description || <span className="text-slate-500 italic">No description provided</span>}
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <span>🖼️</span> Attachments
          </h3>
          {(isEmployee || canFullEdit) && (
            <label className="inline-flex items-center gap-2 rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm font-medium text-slate-100 cursor-pointer transition">
              <Upload className="h-4 w-4" />
              <span>Upload Images</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleAttachmentUpload}
                disabled={uploadingAttachments}
                className="hidden"
              />
            </label>
          )}
        </div>

        <ImageGallery
          attachments={task.attachments || []}
          onDelete={canDeleteAttachments ? handleDeleteAttachment : undefined}
          canDelete={canDeleteAttachments}
          isLoading={uploadingAttachments || deletingAttachments.size > 0}
        />
      </div>

      {/* Employee Update Panel */}
      {isEmployee && (
        <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Update Task</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 uppercase">Assignee</label>
              <select
                value={newAssignee || ""}
                onChange={(e) => setNewAssignee(e.target.value || null)}
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Unassigned</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 uppercase">Status</label>
              <select
                value={newStatus || "backlog"}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-900 hover:brightness-95 disabled:opacity-50"
            >
              {updating ? "Updating..." : "Update"}
            </button>
            <button
              onClick={() => {
                setNewAssignee(task.assignee?._id || null);
                setNewStatus(task.status);
              }}
              className="rounded-md px-4 py-2 text-sm text-slate-300 hover:text-slate-100"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Activity Timeline Section */}
      <div className="rounded-lg border border-slate-800/40 bg-slate-900/40 p-6">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <span>📋</span> Activity Timeline
        </h3>
        <ActivityTimeline taskId={taskId} />
      </div>
    </div>
  );
}
