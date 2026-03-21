/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { ExternalLink, Users, MoreVertical, Briefcase, Layout } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

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
  key: "",
  clientName: "",
  description: "",
  status: "active" as Project["status"]
};


export default function ProjectsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "hr" || user?.role === "manager";

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
  const [memberSearch, setMemberSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectPage, setProjectPage] = useState(1);
  const PROJECTS_PER_PAGE = 20;
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

  const [isViewing, setIsViewing] = useState(false);

  function startView(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      key: (project as any).key || "",
      clientName: project.clientName || "",
      description: project.description || "",
      status: project.status
    });
    setSelectedMembers(project.members.map((m) => m.id));
    setLogoFile(null);
    setIsViewing(true);
    setShowForm(true);
    setError(null);
    setMemberSearch("");
  }

  function startNew() {
    setEditingId(null);
    setIsViewing(false);
    setForm(emptyProjectForm);
    setSelectedMembers([]);
    setLogoFile(null);
    setShowForm(true);
    setError(null);
    setMemberSearch("");
  }


  function startEdit(project: Project) {
    setEditingId(project.id);
    setIsViewing(false);
    setForm({
      name: project.name,
      key: (project as any).key || "",
      clientName: project.clientName || "",
      description: project.description || "",
      status: project.status
    });

    setSelectedMembers(project.members.map((m) => m.id));
    setLogoFile(null);
    setShowForm(true);
    setError(null);
    setMemberSearch("");
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isViewing) {
        setShowForm(false);
        return;
    }
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("key", form.key);
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

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p as any).key?.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const paginatedProjects = filteredProjects.slice(
    (projectPage - 1) * PROJECTS_PER_PAGE,
    projectPage * PROJECTS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);

  useEffect(() => {
    setProjectPage(1);
  }, [projectSearch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-semibold text-text-primary">Projects</h1>
          <p className="text-xs text-text-secondary">
            Manage internal projects and team assignments.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={startNew}
            className="rounded-full bg-accent px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 hover:bg-cyan-400"
          >
            + New Project
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-rose-700 bg-rose-950/60 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </p>
      )}

      {/* Project Search Bar */}
      <div className="relative max-w-sm">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search projects by name, key, or client..."
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          className="w-full rounded-xl border border-border-color bg-card/80 py-2.5 pl-9 pr-4 text-xs text-text-primary outline-none transition-all placeholder:text-text-secondary hover:border-border-color focus:border-accent focus:ring-1 focus:ring-accent/40 shadow-sm"
        />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading && (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-xl border border-border-color bg-bg-secondary/40 p-4 animate-pulse">
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-card-bg" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-20 rounded bg-card-bg" />
                      <div className="h-2 w-12 rounded bg-card-bg/60" />
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-md bg-card-bg/60" />
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-2.5 w-full rounded bg-card-bg/40" />
                  <div className="h-2.5 w-3/4 rounded bg-card-bg/40" />
                </div>
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <div className="flex items-center -space-x-1.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-5 w-5 rounded-full border border-slate-900 bg-card-bg" />
                    ))}
                  </div>
                  <div className="h-4 w-16 rounded bg-card-bg/60" />
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && paginatedProjects.length === 0 && (
          <div className="col-span-12 rounded-xl border border-dashed border-border-color bg-bg-primary/40 px-4 py-12 flex flex-col items-center justify-center text-center">
            <svg className="h-10 w-10 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm font-semibold text-text-secondary">No projects found</p>
          </div>
        )}
        {paginatedProjects.map((project) => {
          const initials = project.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "P";
          const statusLabel = project.status.toUpperCase().replace("_", " ");

          return (
            <Link
              key={project.id}
              href={`/dashboard/kanban/${project.id}`}
              className="group flex flex-col rounded-xl border border-border-color/60 bg-card/40 p-3 shadow-sm hover:border-accent/40 hover:bg-bg-secondary/60 transition-all duration-300 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-slate-950"
                    style={{ backgroundColor: project.color || "#4F46E5" }}
                  >
                    {project.logoUrl ? (
                      <img src={project.logoUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-[11px] font-bold text-text-primary group-hover:text-accent transition-colors">
                      {project.name}
                    </span>
                    <span className="text-[9px] font-black text-text-secondary uppercase tracking-tighter">
                      {(project as any).key}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startView(project);
                    }}
                    className="h-6 w-6 rounded-md flex items-center justify-center bg-card-bg/50 text-text-secondary hover:text-text-primary"
                   >
                     <Layout size={12} />
                   </button>
                   {canManage && (
                     <button
                      type="button"
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          startEdit(project);
                      }}
                      className="h-6 w-6 rounded-md flex items-center justify-center bg-card-bg/50 text-text-secondary hover:text-accent"
                     >
                       <MoreVertical size={12} />
                     </button>
                   )}
                </div>
              </div>

              {project.description && (
                <p className="mt-2 line-clamp-2 text-[10px] text-text-secondary/80 leading-relaxed">
                  {project.description}
                </p>
              )}

              <div className="mt-auto pt-3 flex items-center justify-between">
                <div className="flex items-center -space-x-1.5">
                  {project.members.slice(0, 3).map((m) => (
                    <div key={m.id} className="h-5 w-5 rounded-full border border-slate-900 bg-card-bg ring-1 ring-border-color">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[7px] font-bold text-text-secondary capitalize">
                          {m.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                  {project.members.length > 3 && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-900 bg-card-bg text-[7px] font-black text-text-secondary ring-1 ring-border-color">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest border border-current opacity-70 ${
                    project.status === "active" ? "text-emerald-400 bg-emerald-400/5" : "text-text-secondary bg-slate-500/5"
                  }`}>
                    {statusLabel}
                  </span>
                  <div className="p-1 rounded bg-accent/10 border border-accent/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={8} className="text-accent" />
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-accent transition-all duration-500 group-hover:w-full" />
            </Link>
          );
        })}
      </section>

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-card/50 px-4 py-3 rounded-xl border border-border-color/50">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            Page <span className="text-text-secondary mx-1">{projectPage}</span> of <span className="text-text-secondary mx-1">{totalPages}</span>
            <span className="ml-4 lowercase text-[10px] text-slate-600 font-normal tracking-normal">- {filteredProjects.length} total projects</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProjectPage(p => Math.max(1, p - 1))}
              disabled={projectPage === 1}
              className="px-3 py-1.5 rounded-lg border border-border-color bg-card-bg/50 text-[11px] font-bold text-text-secondary hover:bg-hover-bg hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => setProjectPage(p => Math.min(totalPages, p + 1))}
              disabled={projectPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-border-color bg-card-bg/50 text-[11px] font-bold text-text-secondary hover:bg-hover-bg hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-end bg-black/40">
          <div className="h-full w-full max-w-md border-l border-border-color bg-bg-primary/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-primary">
                  {isViewing ? "Project details" : (editingId ? "Edit project" : "New project")}
                </p>
                <p className="text-[11px] text-text-secondary">
                  {isViewing ? "Overview of project settings." : "Set basic details and assign team members."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full px-2 py-1 text-[11px] text-text-secondary hover:bg-card-bg hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="mt-4 space-y-3 text-[11px]"
            >
              <div>
                <label className="mb-1 block text-text-secondary">Project name</label>
                <input
                  value={form.name}
                  disabled={isViewing}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="h-8 w-full cursor-pointer rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none transition-all hover:border-border-color focus:border-accent focus:ring-1 focus:ring-accent/40 disabled:opacity-70 disabled:cursor-default"
                />
              </div>

              <div>
                <label className="mb-1 block text-text-secondary">Project Key</label>
                <input
                  value={form.key}
                  disabled={isViewing}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, key: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. PRJ"
                  className="h-8 w-full cursor-pointer rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none transition-all hover:border-border-color focus:border-accent focus:ring-1 focus:ring-accent/40 disabled:opacity-70 disabled:cursor-default"
                />
                <p className="mt-0.5 text-[9px] text-text-secondary">
                  Short unique code for tasks (e.g., PROJ-123). Generated automatically if blank.
                </p>
              </div>


              <div>
                <label className="mb-1 block text-text-secondary">Client</label>
                <input
                  value={form.clientName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, clientName: e.target.value }))
                  }
                  className="h-8 w-full cursor-pointer rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none transition-all hover:border-border-color focus:border-accent focus:ring-1 focus:ring-accent/40"
                  placeholder="Internal or client name"
                />
              </div>

              <div>
                <label className="mb-1 block text-text-secondary">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  disabled={isViewing}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value
                    }))
                  }
                  className="w-full rounded-md border border-border-color bg-bg-primary/60 px-2 py-1.5 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 disabled:opacity-70 disabled:cursor-default"
                  placeholder="Optional short summary"
                />
              </div>

              <div>
                <label className="mb-1 block text-text-secondary">
                  Project status
                </label>
                <select
                  value={form.status}
                  disabled={isViewing}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as Project["status"]
                    }))
                  }
                  className="h-8 w-full cursor-pointer rounded-md border border-border-color bg-bg-primary/60 px-2 text-[11px] text-text-primary outline-none transition-all hover:border-border-color focus:border-accent focus:ring-1 focus:ring-accent/40 disabled:opacity-70"
                >
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-text-secondary">
                  Project logo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setLogoFile(file ?? null);
                  }}
                  className="block w-full text-[11px] text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-card-bg file:px-3 file:py-1 file:text-[11px] file:font-medium file:text-text-primary hover:file:bg-slate-700"
                />
              </div>

              <div>
                <label className="mb-2 block text-text-secondary">
                  Assign team members
                </label>

                {/* Selected Members Chips */}
                {selectedMembers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5 rounded-lg border border-border-color/50 bg-bg-secondary/30 p-2">
                    {selectedMembers.map(id => {
                      const user = users.find(u => u.id === id);
                      if (!user) return null;
                      return (
                        <div key={id} className="flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 pl-1 pr-2 py-0.5 animate-in fade-in zoom-in duration-200">
                          <div className="h-4 w-4 rounded-full bg-card-bg overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[7px] text-accent font-bold">
                                {user.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className="text-[9px] font-medium text-accent-light">{user.name}</span>
                          {!isViewing && (
                              <button
                                type="button"
                                onClick={() => toggleMember(id)}
                                className="text-accent/60 hover:text-rose-400 transition-colors"
                              >
                                ✕
                              </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isViewing && (
                    <>
                        <div className="relative mb-2">
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            className="h-8 w-full rounded-md border border-border-color bg-bg-primary/60 pl-8 pr-2 text-[11px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                        />
                        <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        </div>

                        <div className="max-h-48 overflow-y-auto rounded-md border border-border-color bg-bg-primary/60 custom-scrollbar">
                        {users.filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 ? (
                            <p className="px-3 py-6 text-center text-[10px] text-text-secondary italic">
                            {users.length === 0 ? "No employees available yet." : "No matching employees found."}
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-800/50">
                            {users
                                .filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                                .map((u) => {
                                const isSelected = selectedMembers.includes(u.id);
                                return (
                                    <div
                                    key={u.id}
                                    onClick={() => toggleMember(u.id)}
                                    className={`flex cursor-pointer items-center justify-between px-3 py-2 text-[11px] transition-colors hover:bg-card-bg/40 ${isSelected ? "bg-accent/5" : ""
                                        }`}
                                    >
                                    <div className="flex items-center gap-2.5">
                                        <div className={`relative h-7 w-7 rounded-full bg-card-bg overflow-hidden ring-1 ${isSelected ? "ring-accent" : "ring-slate-700"}`}>
                                        {u.avatarUrl ? (
                                            <img
                                            src={u.avatarUrl}
                                            alt={u.name}
                                            className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-[9px] text-text-secondary font-medium">
                                            {u.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                                            </div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                                            <svg className="h-3 w-3 text-accent" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            </div>
                                        )}
                                        </div>
                                        <div className="flex flex-col">
                                        <span className={`font-medium ${isSelected ? "text-accent" : "text-text-primary"}`}>
                                            {u.name}
                                        </span>
                                        </div>
                                    </div>
                                    <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-accent border-accent" : "border-border-color bg-transparent"
                                        }`}>
                                        {isSelected && (
                                        <svg className="h-2.5 w-2.5 text-slate-950" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        )}
                                    </div>
                                    </div>
                                );
                                })}
                            </div>
                        )}
                        </div>
                    </>
                )}
              </div>


              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-border-color px-3 py-1 text-[11px] text-text-primary hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-accent px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-cyan-500/40 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isViewing 
                    ? "Close"
                    : (saving
                      ? (editingId ? "Saving..." : "Creating...")
                      : (editingId ? "Save changes" : "Create project"))
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

