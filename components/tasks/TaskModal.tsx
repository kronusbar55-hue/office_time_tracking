"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (task?: any) => void;
  initial?: any | null;
};

export default function TaskModal({ open, onClose, onSaved, initial }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"Task" | "Bug" | "Improvement">("Task");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setType(initial.type || "Task");
      setPriority(initial.priority || "Medium");
      setProjectId(initial.project?._id || null);
      setAssigneeId(initial.assignee?._id || null);
      setDueDate(initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : null);
    } else {
      setTitle("");
      setDescription("");
      setType("Task");
      setPriority("Medium");
      setProjectId(null);
      setAssigneeId(null);
      setDueDate(null);
    }
    setError(null);
  }, [initial, open]);

  useEffect(() => {
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

    if (open) void loadMeta();
  }, [open]);

  // Filter users based on selected project
  const filteredUsers = projectId && projects.length > 0
    ? (projects.find((p: any) => p.id === projectId)?.members || []).map((m: any) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName
      }))
    : users;

  if (!open) return null;

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
        dueDate: dueDate || undefined
      };

      let res: Response;

      // If creating and attachments exist, send multipart/form-data
      if (!initial && attachments.length > 0) {
        const form = new FormData();
        form.append("title", payload.title);
        form.append("description", payload.description || "");
        form.append("type", payload.type || "Task");
        form.append("priority", payload.priority || "Medium");
        form.append("project", String(payload.project));
        if (payload.assignee) form.append("assignee", String(payload.assignee));
        form.append("reporter", String(window.localStorage.getItem("userId") || ""));
        if (payload.dueDate) form.append("dueDate", String(payload.dueDate));
        attachments.forEach((f) => form.append("attachments", f));

        res = await fetch(`/api/tasks`, {
          method: "POST",
          body: form
        });
      } else if (!initial) {
        res = await fetch(`/api/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, reporter: window.localStorage.getItem("userId") || undefined })
        });
      } else {
        // edit path: keep JSON
        res = await fetch(`/api/tasks/${initial._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save task");
      }

      const json = await res.json();
      toast.success(initial ? "Task updated successfully!" : "Task created successfully!");
      onSaved(json.data || json);
      onClose();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <form onSubmit={handleSubmit} className="z-10 w-[800px] rounded-lg bg-card/90 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-50">{initial ? "Edit Task" : "Create Task"}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-slate-300">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100" />
          </div>

          <div>
            <label className="text-[11px] text-slate-300">Project</label>
            <select value={projectId || ""} onChange={(e) => setProjectId(e.target.value || null)} required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
              <option value="">Select project</option>
              {loadingMeta ? <option>Loading...</option> : projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Improvement">Improvement</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300">Assignee</label>
            <select value={assigneeId || ""} onChange={(e) => setAssigneeId(e.target.value || null)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
              <option value="">Unassigned</option>
              {loadingMeta ? <option>Loading...</option> : filteredUsers.map((u:any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300">Due date</label>
            <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value || null)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100" />
          </div>

        </div>

        <div className="mt-4">
          <label className="text-[11px] text-slate-300">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100" rows={4} />
        </div>

        <div className="mt-4">
          <label className="text-[11px] text-slate-300">Attachments (images)</label>
          <input type="file" accept="image/*" multiple onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            setAttachments(files);
          }} className="mt-1 w-full text-sm text-slate-100" />
          {attachments.length > 0 && (
            <div className="mt-2 text-xs text-slate-300">{attachments.map((f) => f.name).join(", ")}</div>
          )}
        </div>

        {error && <p className="mt-3 text-[11px] text-rose-300">{error}</p>}

        <div className="mt-6 flex items-center gap-2">
          <button type="submit" disabled={submitting} className={`inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-900 ${submitting ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"}`}>
            {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" /> : <Check className="h-4 w-4" />}
            <span>{initial ? "Save changes" : "Create Task"}</span>
          </button>

          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-slate-300 hover:text-slate-100">Cancel</button>
        </div>
      </form>
    </div>
  );
}
