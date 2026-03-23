"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Upload, MessageSquare, Clock, Check } from "lucide-react";
import { toast } from "react-toastify";
import ActivityTimeline from "@/components/tasks/ActivityTimeline";
import TaskComments from "@/components/tasks/TaskComments";
import ImageGallery from "@/components/tasks/ImageGallery";
import TaskEditor from "@/components/tasks/TaskEditor";
import TaskForm from "@/components/tasks/TaskForm";
import TaskModal from "@/components/tasks/TaskModal";
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
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [isEditing, setIsEditing] = useState(false);

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
          setNewStatus(taskData.data?.status || "todo");

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
  const canFullEdit = ["admin", "manager", "hr"].includes(user?.role || "");
  const canDeleteAttachments = canFullEdit;

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
      setNewAssignee(data.data?.assignee?._id || null);
      setNewStatus(data.data?.status || "todo");
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
          <div className="h-6 w-1/2 animate-pulse rounded bg-card-bg/40" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-card-bg/40" />
          <div className="mt-6 h-32 animate-pulse rounded bg-card-bg/40" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6">
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-center text-text-secondary">Task not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <div className="rounded-2xl border border-border-color/40 bg-bg-secondary/40 p-8 shadow-xl">
        {isEditing ? (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
             <TaskForm 
               initial={task} 
               onSaved={(updated) => {
                 setTask(updated);
                 setIsEditing(false);
               }} 
               onCancel={() => setIsEditing(false)} 
               showHeader={false}
             />
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-black text-text-primary tracking-tighter uppercase">{task.key} — {task.title}</h1>
                <p className="mt-2 text-sm text-text-secondary font-medium">{task.project?.name}</p>
              </div>
              {canFullEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-md bg-accent px-4 py-2 text-sm font-black uppercase tracking-tighter text-slate-900 shadow-lg shadow-accent/20 hover:brightness-95 transition-all"
                >
                  Edit Task
                </button>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Type</div>
                <div className="text-sm text-text-primary font-bold">{task.type}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Priority</div>
                <div className="text-sm text-text-primary font-bold">
                  <span className={`px-2 py-0.5 rounded ${
                    task.priority === 'Critical' ? 'bg-red-500/20 text-red-100' :
                    task.priority === 'High' ? 'bg-orange-500/20 text-orange-100' :
                    'bg-blue-500/20 text-blue-100'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Due Date</div>
                <div className="text-sm text-text-primary font-bold">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Reporter</div>
                <div className="text-sm text-text-primary font-bold">
                  {task.reporter ? `${task.reporter.firstName} ${task.reporter.lastName}` : "—"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Assignee</div>
                <div className="text-sm text-text-primary font-bold">
                  {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-text-secondary uppercase font-black tracking-widest">Status</div>
                <div className="text-sm text-text-primary font-bold uppercase tracking-tighter">
                  {task.status?.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-border-color/40 pt-8">
              <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest mb-4">Description</h3>
              <div className="text-sm text-text-primary leading-relaxed bg-bg-primary/20 rounded-xl p-4 border border-border-color/20">
                {task.description ? (
                  <TaskEditor content={task.description} onChange={() => {}} editable={false} />
                ) : (
                  <span className="text-text-secondary italic">No description provided</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Update Section for Employees */}
      {isEmployee && !isEditing && (
        <div className="rounded-2xl border border-border-color/40 bg-bg-secondary/40 p-8 shadow-xl">
           <div className="flex items-center gap-3 mb-6">
             <div className="h-8 w-1 bg-accent rounded-full" />
             <h3 className="text-lg font-black text-text-primary uppercase tracking-tighter">Quick Update</h3>
             <span className="text-[10px] bg-accent/10 px-2 py-1 rounded text-accent uppercase font-black tracking-widest ml-auto">Employee View</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest pl-1">Assignee</label>
                <select
                  value={newAssignee || ""}
                  onChange={(e) => setNewAssignee(e.target.value || null)}
                  className="w-full rounded-xl border border-border-color bg-bg-primary/20 px-4 py-3 text-sm text-text-primary font-bold focus:border-accent focus:outline-none transition-all"
                >
                  <option value="">Unassigned</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-text-secondary uppercase font-black tracking-widest pl-1">Status</label>
                <select
                  value={newStatus || "todo"}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-border-color bg-bg-primary/20 px-4 py-3 text-sm text-text-primary font-bold focus:border-accent focus:outline-none transition-all"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="qa">QA</option>
                  <option value="done">Done</option>
                </select>
              </div>
           </div>

           <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="rounded-xl bg-accent px-8 py-3 text-sm font-black uppercase tracking-tighter text-slate-900 shadow-lg shadow-accent/20 hover:brightness-95 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {updating ? (
                  <span className="h-4 w-4 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
                ) : <Check className="h-4 w-4" />}
                {updating ? "Updating..." : "Update Task"}
              </button>
              
              <button
                onClick={() => {
                  setNewAssignee(task.assignee?._id || null);
                  setNewStatus(task.status);
                }}
                className="px-6 py-3 text-xs font-black text-text-secondary uppercase tracking-widest hover:text-text-primary transition-colors"
              >
                Reset Changes
              </button>
           </div>
        </div>
      )}

      {/* Attachments Section */}
      <div className="rounded-lg border border-border-color/40 bg-bg-secondary/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <span>🖼️</span> Attachments
          </h3>
          {canFullEdit && (
            <label className="inline-flex items-center gap-2 rounded-md bg-card-bg hover:bg-hover-bg px-3 py-2 text-sm font-medium text-text-primary cursor-pointer transition">
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


      {/* Activity / Comments Tabbed Section */}
      <div className="rounded-lg border border-border-color/40 bg-bg-secondary/40 overflow-hidden shadow-xl">
        <div className="flex items-center gap-1 p-1 bg-bg-secondary/60 border-b border-border-color">
          <button
            onClick={() => setActiveTab("comments")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-black transition-all uppercase tracking-tighter ${
              activeTab === "comments"
                ? "bg-accent text-slate-950 shadow-lg shadow-accent/20"
                : "text-text-secondary hover:text-text-primary hover:bg-hover-bg"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Comments</span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-black transition-all uppercase tracking-tighter ${
              activeTab === "activity"
                ? "bg-accent text-slate-950 shadow-lg shadow-accent/20"
                : "text-text-secondary hover:text-text-primary hover:bg-hover-bg"
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Activity</span>
          </button>
        </div>

        <div className="p-6">
          {activeTab === "comments" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TaskComments taskId={taskId} />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ActivityTimeline taskId={taskId} />
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
