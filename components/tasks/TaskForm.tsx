"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Upload, AlertCircle, X } from "lucide-react";
import TaskEditor from "./TaskEditor";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthProvider";

type Props = {
  initial?: any | null;
  onSaved: (task?: any) => void;
  onCancel: () => void;
  showHeader?: boolean;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default function TaskForm({ initial, onSaved, onCancel, showHeader = true }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"Task" | "Bug" | "Improvement">("Task");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [status, setStatus] = useState("todo");
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "manager" || user?.role === "hr";
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || "");
      setDescription(initial.description || "");
      setType(initial.type || "Task");
      setPriority(initial.priority || "Medium");
      setProjectId(initial.project?._id || (typeof initial.project === "string" ? initial.project : null));
      setAssigneeId(initial.assignee?._id || (typeof initial.assignee === "string" ? initial.assignee : null));
      setDueDate(initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : null);
      setStatus(initial.status || "todo");
    }
  }, [initial]);

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
    loadMeta();
  }, []);

  const filteredUsers = projectId && projects.length > 0
    ? (projects.find((p: any) => p.id === projectId)?.members || []).map((m: any) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName
      }))
    : users;

  const validateAndAddFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles: File[] = [];
    const errors: string[] = [];
    Array.from(files).forEach((file) => {
      if (attachments.some((f) => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name} is already added`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name} has unsupported format`);
        return;
      }
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name} exceeds 5MB limit`);
        return;
      }
      newFiles.push(file);
    });
    if (errors.length > 0) errors.forEach((e) => toast.warning(e));
    if (newFiles.length > 0) setAttachments((prev) => [...prev, ...newFiles]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

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

      let res: Response;
      const isEdit = !!(initial?._id || initial?.id);
      
      const form = new FormData();
      Object.entries(payload).forEach(([key, val]) => {
        if (val !== undefined && val !== null) form.append(key, String(val));
      });
      
      if (!isEdit) {
        form.append("reporter", window.localStorage.getItem("userId") || "");
      }

      attachments.forEach(f => form.append("attachments", f));

      res = await fetch(isEdit ? `/api/tasks/${initial._id || initial.id}` : `/api/tasks`, {
        method: isEdit ? "PUT" : "POST",
        body: form
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to save task");
      }

      const json = await res.json();
      toast.success(isEdit ? "Task updated successfully!" : "Task created successfully!");
      onSaved(json.data || json);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {showHeader && (
        <h1 className="text-2xl font-bold text-text-primary mb-6">
          {initial?._id ? "Edit Task" : "Create Task"}
        </h1>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-100">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-text-secondary uppercase">Title</label>
          <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            required 
            className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none" 
          />
        </div>

        <div>
          <label className="text-[11px] text-text-secondary uppercase">Project</label>
          <select 
            value={projectId || ""} 
            onChange={(e) => setProjectId(e.target.value || null)} 
            required 
            disabled={loadingMeta || (!!initial?.project && !(initial?._id || initial?.id))}
            className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none"
          >
            <option value="">Select project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-text-secondary uppercase">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none">
            <option value="Task">Task</option>
            <option value="Bug">Bug</option>
            <option value="Improvement">Improvement</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-text-secondary uppercase">Assignee</label>
          <select value={assigneeId || ""} onChange={(e) => setAssigneeId(e.target.value || null)} className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none">
            <option value="">Unassigned</option>
            {filteredUsers.map((u: any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] text-text-secondary uppercase">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] text-text-secondary uppercase">Due date</label>
          <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value || null)} className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none" />
        </div>

        {initial?._id && (
          <div>
            <label className="text-[11px] text-text-secondary uppercase">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 w-full rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary focus:border-border-color focus:outline-none">
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="qa">QA</option>
              <option value="done">Done</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="text-[11px] text-text-secondary uppercase block mb-1">Description</label>
        <TaskEditor content={description} onChange={(json) => setDescription(json)} />
      </div>

      <div>
        <label className="text-[11px] text-text-secondary uppercase mb-2 block">Attachments (Images)</label>
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
            dragActive ? "border-slate-400 bg-card-bg/40" : "border-border-color bg-bg-secondary/20 h-32 flex flex-col items-center justify-center"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => validateAndAddFiles(e.target.files)} className="hidden" />
          <Upload className="h-5 w-5 text-text-secondary mb-1" />
          <p className="text-xs text-text-secondary">Drag images here or click to select</p>
        </div>
        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-card-bg/50 px-2 py-1 rounded text-xs text-text-primary border border-border-color">
                <span className="truncate max-w-[150px]">{f.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setAttachments(prev => prev.filter((_, idx) => idx !== i)); }} className="text-text-secondary hover:text-red-400">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!canManage && (
        <div className="flex items-center gap-3 rounded-xl bg-bg-secondary/40 border border-border-color/50 p-4 text-xs font-bold text-text-secondary uppercase tracking-widest">
           <AlertCircle className="h-4 w-4" />
           <span>Read Only: Only Admin, HR, and Managers can create or edit tasks.</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-border-color/40">
        {canManage && (
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-md bg-accent px-6 py-2.5 text-sm font-bold text-slate-900 hover:brightness-105 disabled:opacity-50"
          >
            {submitting ? "Saving..." : <><Check size={18} /> Save Task</>}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          {canManage ? "Cancel" : "Close"}
        </button>
      </div>
    </form>
  );
}
