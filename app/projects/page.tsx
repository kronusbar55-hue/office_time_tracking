/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Link from "next/link";
import { ExternalLink, Users, MoreVertical, Briefcase, Layout, Settings, ArrowRight } from "lucide-react";
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




export default function ProjectsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "hr" || user?.role === "manager";

  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


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

  useEffect(() => {
    void loadProjects();
  }, []);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <Layout size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase">Team <span className="text-accent">Projects</span></h1>
            <p className="text-text-secondary font-bold uppercase tracking-widest text-[10px] mt-1">Manage core initiatives and team allocations</p>
          </div>
        </div>
        {canManage && (
          <Link
            href="/projects/new"
            className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-accent text-slate-950 hover:bg-accent-hover transition-all text-sm font-black shadow-xl shadow-accent/20"
          >
            + New Project
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-rose-700 bg-rose-950/60 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </p>
      )}

      {/* Project Search Bar */}
      <div className="relative max-w-sm mb-8">
        <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Scout projects by name, key, or client..."
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
          className="w-full rounded-2xl border border-border-color bg-card/60 py-3.5 pl-12 pr-4 text-xs text-text-primary outline-none transition-all placeholder:text-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent/40 shadow-sm"
        />
      </div>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5">
        {loading && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col rounded-3xl border border-border-color bg-bg-secondary/40 p-6 animate-pulse">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-card-bg" />
                    <div className="space-y-2">
                      <div className="h-4 w-24 rounded bg-card-bg" />
                      <div className="h-2 w-16 rounded bg-card-bg/60" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="h-3 w-full rounded bg-card-bg/40" />
                  <div className="h-3 w-3/4 rounded bg-card-bg/40" />
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between">
                  <div className="flex items-center -space-x-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-8 w-8 rounded-full border-2 border-slate-900 bg-card-bg" />
                    ))}
                  </div>
                  <div className="h-6 w-16 rounded bg-card-bg/60" />
                </div>
              </div>
            ))}
          </>
        )}
        {!loading && paginatedProjects.length === 0 && (
          <div className="col-span-full rounded-3xl border border-dashed border-border-color bg-bg-primary/40 px-4 py-16 flex flex-col items-center justify-center text-center">
            <Layout className="h-16 w-16 text-slate-800 mb-4 opacity-50" />
            <h3 className="text-xl font-black text-text-secondary uppercase tracking-tight">No Active Operations</h3>
            <p className="text-xs text-text-secondary/60 mt-2">Try adjusting your search parameters.</p>
          </div>
        )}
        {paginatedProjects.map((project) => {
          const initials = project.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "P";
          const statusLabel = project.status.toUpperCase().replace("_", " ");

          return (
            <div
              key={project.id}
              className="group flex flex-col rounded-3xl border border-border-color/60 bg-card/40 p-6 shadow-xl hover:border-accent/40 hover:bg-bg-secondary/60 transition-all duration-500 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4">
                <Link href={`/dashboard/kanban/${project.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-slate-950 shadow-lg transition-transform group-hover:scale-110 duration-500"
                    style={{ backgroundColor: project.color || "#4F46E5" }}
                  >
                    {project.logoUrl ? (
                      <img src={project.logoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-base font-black text-text-primary group-hover:text-accent transition-colors leading-tight">
                      {project.name}
                    </span>
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest opacity-60">
                      {(project as any).key}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-2">
                   {canManage && (
                     <Link
                      href={`/projects/${project.id}/edit`}
                      className="h-8 w-8 rounded-xl flex items-center justify-center bg-bg-primary/50 text-text-secondary hover:text-accent hover:bg-accent/10 transition-all border border-border-color/50"
                     >
                       <Settings size={14} />
                     </Link>
                   )}
                </div>
              </div>

              {project.description && (
                <p className="mt-4 line-clamp-2 text-xs text-text-secondary/70 leading-relaxed font-medium">
                  {project.description}
                </p>
              )}

              <div className="mt-8 pt-6 flex items-center justify-between border-t border-border-color/30">
                <div className="flex items-center -space-x-2">
                  {project.members.slice(0, 4).map((m) => (
                    <div key={m.id} className="h-8 w-8 rounded-full border-2 border-slate-900 bg-bg-secondary shadow-sm ring-1 ring-border-color/20 overflow-hidden">
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[8px] font-black text-text-secondary uppercase">
                          {m.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  ))}
                  {project.members.length > 4 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-bg-secondary text-[9px] font-black text-text-secondary ring-1 ring-border-color/20">
                      +{project.members.length - 4}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded-xl px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border transition-all ${
                    project.status === "active" 
                      ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/5 shadow-[0_0_10px_rgba(52,211,153,0.1)]" 
                      : "text-text-secondary border-border-color bg-slate-500/5"
                  }`}>
                    {statusLabel}
                  </span>
                  <Link href={`/dashboard/kanban/${project.id}`} className="p-2 rounded-xl bg-accent/10 border border-accent/20 hover:bg-accent hover:text-slate-950 transition-all group/arrow">
                    <ArrowRight size={12} className="text-accent group-hover/arrow:text-slate-950" />
                  </Link>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-accent transition-all duration-700 group-hover:w-full opacity-50" />
            </div>
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

    </div>
  );
}

