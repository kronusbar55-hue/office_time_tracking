"use client";

import { useEffect, useState } from "react";
import { Search, Edit2, Trash2, Plus } from "lucide-react";
import TechnologyModal from "@/components/technologies/TechnologyModal";

type Technology = {
  id: string;
  name: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export default function TechnologiesPage() {
  const [techs, setTechs] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technology | null>(null);

  async function loadTechnologies() {
    setLoading(true);
    try {
      const res = await fetch("/api/technologies?includeInactive=true");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as Technology[];
      setTechs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTechnologies();
  }, []);

  function openAddModal() {
    setEditingTech(null);
    setModalOpen(true);
  }

  function openEditModal(tech: Technology) {
    setEditingTech(tech);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deactivate this technology?")) return;
    try {
      const res = await fetch(`/api/technologies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await loadTechnologies();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = techs.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold text-slate-50">Technology Management</h1>
          <p className="text-xs text-slate-400">Manage the core tech stack used across projects and teams.</p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-900 hover:brightness-95"
        >
          <Plus className="h-4 w-4" />
          Add Technology
        </button>
      </div>

      <section className="rounded-xl border border-slate-800 bg-card/80 p-4 shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-950/60 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/40">
          <table className="min-w-full border-separate border-spacing-0 text-[11px]">
            <thead>
              <tr className="bg-slate-900/60 text-slate-400">
                <th className="px-4 py-2 text-left font-medium">NO</th>
                <th className="px-4 py-2 text-left font-medium">TECHNOLOGY NAME</th>
                {/* <th className="px-4 py-2 text-left font-medium">DESCRIPTION</th> */}
                <th className="px-4 py-2 text-left font-medium">STATUS</th>
                <th className="px-4 py-2 text-left font-medium">CREATED DATE</th>
                <th className="px-4 py-2 text-right font-medium">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <tr key={i} className="border-t border-slate-800/70">
                      <td className="px-4 py-2"><div className="h-4 w-6 rounded bg-slate-700/40 animate-pulse" /></td>
                      <td className="px-4 py-2"><div className="h-4 w-24 rounded bg-slate-700/40 animate-pulse" /></td>
                      <td className="px-4 py-2"><div className="h-4 w-32 rounded bg-slate-700/40 animate-pulse" /></td>
                      <td className="px-4 py-2"><div className="h-4 w-16 rounded bg-slate-700/40 animate-pulse" /></td>
                      <td className="px-4 py-2"><div className="h-4 w-20 rounded bg-slate-700/40 animate-pulse" /></td>
                      <td className="px-4 py-2"><div className="h-4 w-16 rounded bg-slate-700/40 animate-pulse ml-auto" /></td>
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No technologies found.
                  </td>
                </tr>
              ) : (
                filtered.map((tech, idx) => (
                  <tr key={tech.id} className="border-t border-slate-800/70 text-slate-200 hover:bg-slate-800/30">
                    <td className="px-4 py-2 text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-100">{tech.name}</td>
                    {/* <td className="px-4 py-2 text-slate-400">—</td> */}
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        tech.status === "active"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {tech.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-400">
                      {tech.createdAt ? new Date(tech.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(tech)}
                          className="rounded-md p-1 text-slate-400 hover:text-accent"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => void handleDelete(tech.id)}
                          className="rounded-md p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TechnologyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          void loadTechnologies();
        }}
        initial={editingTech}
      />
    </div>
  );
}
