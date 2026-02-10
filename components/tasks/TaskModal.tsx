"use client";

import { useEffect, useState, useRef } from "react";
import { Check, X, Upload, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (task?: any) => void;
  initial?: any | null;
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null);

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
      setAttachments([]);
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

  const validateAndAddFiles = (files: FileList | null) => {
    if (!files) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Check if file already added
      if (attachments.some((f) => f.name === file.name && f.size === file.size)) {
        errors.push(`${file.name} is already added`);
        return;
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name} has unsupported format (use JPG, PNG, or WebP)`);
        return;
      }

      // Check file size
      if (file.size > MAX_SIZE) {
        errors.push(`${file.name} exceeds 5MB limit`);
        return;
      }

      newFiles.push(file);
    });

    if (errors.length > 0) {
      errors.forEach((e) => toast.warning(e));
    }

    if (newFiles.length > 0) {
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFilePreview = (file: File): string => {
    return URL.createObjectURL(file);
  };

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

      <form onSubmit={handleSubmit} className="z-10 w-[900px] rounded-lg bg-card/90 p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-50">{initial ? "Edit Task" : "Create Task"}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Grid of fields */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] text-slate-300 uppercase">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none" />
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Project</label>
            <select value={projectId || ""} onChange={(e) => setProjectId(e.target.value || null)} required className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none">
              <option value="">Select project</option>
              {loadingMeta ? <option>Loading...</option> : projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none">
              <option value="Task">Task</option>
              <option value="Bug">Bug</option>
              <option value="Improvement">Improvement</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Assignee</label>
            <select value={assigneeId || ""} onChange={(e) => setAssigneeId(e.target.value || null)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none">
              <option value="">Unassigned</option>
              {loadingMeta ? <option>Loading...</option> : filteredUsers.map((u:any) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-300 uppercase">Due date</label>
            <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value || null)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none" />
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="text-[11px] text-slate-300 uppercase">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-slate-600 focus:outline-none" rows={3} />
        </div>

        {/* Image Attachments Section */}
        <div className="mb-4">
          <label className="text-[11px] text-slate-300 uppercase mb-2 block">Attachments (Images)</label>
          
          {/* Drag and Drop Zone */}
          <div
            ref={dragContainerRef}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-lg border-2 border-dashed transition-colors p-6 text-center cursor-pointer ${
              dragActive
                ? "border-slate-400 bg-slate-800/40"
                : "border-slate-700 bg-slate-900/20 hover:border-slate-600"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-300">
                  Drag images here or click to select
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supports JPG, PNG, WebP • Max 5MB per file
                </p>
              </div>
            </div>
          </div>

          {/* Selected Files Preview */}
          {attachments.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400 uppercase font-medium">
                    Selected Files
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-1 text-xs font-semibold text-accent">
                    {attachments.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {(attachments.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg border border-slate-700 overflow-hidden bg-slate-900/40"
                  >
                    <img
                      src={getFilePreview(file)}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    
                    {/* File Index Badge */}
                    <div className="absolute top-1 left-1 bg-slate-900/80 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-300">
                      {index + 1}
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="rounded-lg p-1.5 bg-red-600 hover:bg-red-700 text-white transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                      <p className="text-xs text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-300">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error messages */}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/40 p-3">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-900 transition ${
              submitting ? "opacity-60 cursor-not-allowed" : "hover:brightness-95"
            }`}
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>{initial ? "Save changes" : "Create Task"}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
