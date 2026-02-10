/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type MemberOption = {
  id: string;
  name: string;
  avatarUrl?: string;
};

type Project = {
  id: string;
  name: string;
  clientName?: string;
  description?: string;
  status: "active" | "on_hold" | "completed" | "archived";
  logoUrl?: string;
  color?: string;
  members: MemberOption[];
};

type UserListItem = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
};

const emptyProjectForm = {
  name: "",
  clientName: "",
  description: "",
  status: "active" as Project["status"]
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState(emptyProjectForm);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function loadProjects() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        throw new Error("Failed to load projects");
      }
      const data = (await res.json()) as Project[];
      setProjects(data);
    } catch (e) {
      console.error(e);
      setError("Could not load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = (await res.json()) as UserListItem[];
      setUsers(
        data.map((u) => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          avatarUrl: u.avatarUrl
        }))
      );
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void loadProjects();
    void loadUsers();
  }, []);

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyProjectForm);
    setSelectedMembers([]);
    setLogoFile(null);
    setShowForm(true);
    setError(null);
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      clientName: project.clientName || "",
      description: project.description || "",
      status: project.status
    });
    setSelectedMembers(project.members.map((m) => m.id));
    setLogoFile(null);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("name", form.name);
      if (form.clientName) formData.set("clientName", form.clientName);
      if (form.description) formData.set("description", form.description);
      formData.set("status", form.status);
      selectedMembers.forEach((id) => formData.append("memberIds", id));
      if (logoFile) formData.set("logo", logoFile);

      const url = editingId ? `/api/projects/${editingId}` : "/api/projects";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to save project");
      }

      toast.success(editingId ? "Project updated successfully!" : "Project created successfully!");
      await loadProjects();
      setShowForm(false);
      setForm(emptyProjectForm);
      setSelectedMembers([]);
      setLogoFile(null);
      setEditingId(null);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Failed to save project.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function archiveProject(id: string) {
    if (!window.confirm("Archive this project?")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to archive project");
      toast.success("Project archived successfully!");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      console.error(e);
      const errorMessage = "Could not archive project.";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-slate-50">Projects</h1>
          <p className="text-xs text-slate-400">
            Manage internal projects and team assignments.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-accent px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 hover:bg-cyan-400"
        >
          + New Project
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-rose-700 bg-rose-950/60 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {loading && (
          <div className="col-span-3 text-[11px] text-slate-500">
            Loading projects...
          </div>
        )}
        {!loading && projects.length === 0 && (
          <div className="col-span-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-[11px] text-slate-500">
            No projects yet. Create your first project to get started.
          </div>
        )}
        {projects.map((project) => {
          const initials =
            project.name
              .split(" ")
              .map((w) => w.charAt(0))
              .join("")
              .slice(0, 2)
              .toUpperCase() || "P";

          const statusLabel =
            project.status === "active"
              ? "ACTIVE"
              : project.status === "completed"
              ? "COMPLETED"
              : project.status === "on_hold"
              ? "ON HOLD"
              : "ARCHIVED";

          const statusClass =
            project.status === "active"
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/40"
              : project.status === "completed"
              ? "bg-sky-500/10 text-sky-300 ring-sky-500/40"
              : project.status === "on_hold"
              ? "bg-amber-500/10 text-amber-300 ring-amber-500/40"
              : "bg-slate-700/40 text-slate-300 ring-slate-600/60";

          return (
            <article
              key={project.id}
              className="flex flex-col rounded-2xl border border-slate-800 bg-card/80 p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold text-slate-950"
                    style={{
                      backgroundColor: project.color || "#4F46E5"
                    }}
                  >
                    {project.logoUrl ? (
                      <img
                        src={project.logoUrl}
                        alt={project.name}
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-50">
                      {project.name}
                    </span>
                    {project.clientName && (
                      <span className="text-[11px] text-slate-400">
                        {project.clientName}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => startEdit(project)}
                  className="rounded-full px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                >
                  •••
                </button>
              </div>

              {project.description && (
                <p className="mt-3 line-clamp-2 text-[11px] text-slate-400">
                  {project.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center -space-x-2">
                  {project.members.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      className="h-6 w-6 rounded-full border border-slate-900 bg-slate-700"
                    >
                      {m.avatarUrl && m.name ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.name}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-200">
                          {(m.name || "P")
                            .split(" ")
                            .map((w) => w.charAt(0))
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {project.members.length > 4 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-900 bg-slate-800 text-[9px] text-slate-200">
                      +{project.members.length - 4}
                    </div>
                  )}
                </div>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => archiveProject(project.id)}
                className="mt-3 self-start text-[10px] text-slate-500 hover:text-rose-300"
              >
                Archive project
              </button>
            </article>
          );
        })}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-end bg-black/40">
          <div className="h-full w-full max-w-md border-l border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-50">
                  {editingId ? "Edit project" : "New project"}
                </p>
                <p className="text-[11px] text-slate-500">
                  Set basic details and assign team members.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-4 space-y-3 text-[11px]"
            >
              <div>
                <label className="mb-1 block text-slate-300">Project name</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">Client</label>
                <input
                  value={form.clientName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, clientName: e.target.value }))
                  }
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                  placeholder="Internal or client name"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                  placeholder="Optional short summary"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">
                  Project status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as Project["status"]
                    }))
                  }
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-slate-300">
                  Project logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setLogoFile(file ?? null);
                  }}
                  className="block w-full text-[11px] text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-[11px] file:font-medium file:text-slate-100 hover:file:bg-slate-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">
                  Assign team members
                </label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-slate-700 bg-slate-950/60">
                  {users.length === 0 && (
                    <p className="px-2 py-2 text-[11px] text-slate-500">
                      No employees available yet.
                    </p>
                  )}
                  {users.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[11px] text-slate-100 hover:bg-slate-800/60"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-accent"
                        checked={selectedMembers.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                      />
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px]">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            u.name
                              .split(" ")
                              .map((w) => w.charAt(0))
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()
                          )}
                        </span>
                        <span>{u.name}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Creating..."
                    : editingId
                    ? "Save changes"
                    : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

