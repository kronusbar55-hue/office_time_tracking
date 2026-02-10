"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Check, X } from "lucide-react";
import { toast } from "react-toastify";

export default function TaskEditPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"Task" | "Bug" | "Improvement">("Task");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [status, setStatus] = useState("backlog");

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        setUser(meData.user || null);

        // Check if user is admin or manager
        if (!meData.user || (meData.user.role !== "admin" && meData.user.role !== "manager")) {
          toast.error("You don't have permission to edit tasks");
          router.push(`/tasks/${taskId}`);
          return;
        }

        const taskRes = await fetch(`/api/tasks/${taskId}`);
        if (!taskRes.ok) throw new Error("Failed to load task");
        const taskData = await taskRes.json();
        const t = taskData.data;
        setTask(t);

        setTitle(t.title || "");
        setDescription(t.description || "");
        setType(t.type || "Task");
        setPriority(t.priority || "Medium");
        setProjectId(t.project?._id || null);
        setAssigneeId(t.assignee?._id || null);
        setDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null);
        setStatus(t.status || "backlog");
      } catch (err) {
        console.error(err);
        toast.error("Failed to load task");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [taskId, router]);

  useEffect(() => {
    if (!task) return;
    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [projRes, usersRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/users")
        ]);
        if (projRes.ok) {
          const p = await projRes.json();
          setProjects(p || []);
        }
        if (usersRes.ok) {
          const u = await usersRes.json();
          setUsers(u || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMeta(false);
      }
    }
    loadMeta();
  }, [task]);

  // Filter users based on selected project
  const filteredUsers = projectId && projects.length > 0
    ? (projects.find((p: any) => p.id === projectId)?.members || []).map((m: any) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName
      }))
    : users;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!title.trim() || !projectId) {
      const msg = "Title and Project are required";
      setError(msg);
      toast.error(msg);
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description,
        type,
        priority,
        project: projectId,
        assignee: assigneeId || undefined,
        dueDate: dueDate || undefined,
        status
      };

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save task");
      }

      toast.success("Task updated successfully!");
      router.push(`/tasks/${taskId}`);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          <div className="h-6 w-1/2 animate-pulse rounded bg-slate-800/40" />
          <div className="mt-6 h-32 animate-pulse rounded bg-slate-800/40" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <div className="text-center text-slate-400">Task not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-6">
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      <form onSubmit={handleSubmit} className="max-w-2xl rounded-lg border border-slate-800/40 bg-slate-900/40 p-6">
        <h1 className="text-2xl font-bold text-slate-50 mb-6">Edit Task</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-slate-300 uppercase">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Project</label>
            <select
              value={projectId || ""}
              onChange={(e) => setProjectId(e.target.value || null)}
              required
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select project</option>
              {loadingMeta ? <option>Loading...</option> : projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Improvement">Improvement</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Assignee</label>
            <select
              value={assigneeId || ""}
              onChange={(e) => setAssigneeId(e.target.value || null)}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Unassigned</option>
              {loadingMeta ? <option>Loading...</option> : filteredUsers.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            >
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Due date</label>
            <input
              type="date"
              value={dueDate || ""}
              onChange={(e) => setDueDate(e.target.value || null)}
              className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] text-slate-300 uppercase">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
            rows={6}
          />
        </div>

        {error && <p className="mt-3 text-[11px] text-rose-300">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-900 ${submitting ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"}`}
          >
            {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" /> : <Check className="h-4 w-4" />}
            <span>Save changes</span>
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md px-4 py-2 text-sm text-slate-300 hover:text-slate-100"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
