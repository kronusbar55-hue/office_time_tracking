"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Users, Layout, Briefcase, ChevronLeft } from "lucide-react";

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

interface ProjectFormProps {
  initialData?: Project;
  isNew?: boolean;
}

const emptyProjectForm = {
  name: "",
  key: "",
  clientName: "",
  description: "",
  status: "active" as Project["status"]
};

export default function ProjectForm({ initialData, isNew = false }: ProjectFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialData ? {
    name: initialData.name,
    key: (initialData as any).key || "",
    clientName: initialData.clientName || "",
    description: initialData.description || "",
    status: initialData.status
  } : emptyProjectForm);

  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    initialData?.members.map(m => m.id) || []
  );
  const [users, setUsers] = useState<MemberOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);

  useEffect(() => {
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
      } finally {
        setLoadingUsers(false);
      }
    }
    void loadUsers();
  }, []);

  function toggleMember(id: string) {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("key", form.key);
      if (form.clientName) formData.set("clientName", form.clientName);
      if (form.description) formData.set("description", form.description);
      formData.set("status", form.status);
      selectedMembers.forEach((id) => formData.append("memberIds", id));
      if (logoFile) formData.set("logo", logoFile);

      const url = isNew ? "/api/projects" : `/api/projects/${initialData?.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to save project");
      }

      toast.success(isNew ? "Project created successfully!" : "Project updated successfully!");
      router.push("/projects");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to save project.");
    } finally {
      setSaving(false);
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-bg-secondary border border-border-color text-text-secondary hover:text-text-primary transition-all shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tight uppercase">
            {isNew ? "Launch New" : "Edit"} <span className="text-accent">Project</span>
          </h1>
          <p className="text-text-secondary font-bold uppercase tracking-widest text-[10px] mt-1">
            {isNew ? "Configure your project settings and team" : `Updating ${initialData?.name}`}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-card/40 border border-border-color p-8 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <Layout size={16} className="text-accent" />
              Core Identity
            </h3>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Project Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-bg-primary/50 border border-border-color rounded-2xl px-5 py-3.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all outline-none"
                    placeholder="e.g. Phoenix Overdrive"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Project Key</label>
                  <input
                    value={form.key}
                    onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value.toUpperCase() }))}
                    className="w-full bg-bg-primary/50 border border-border-color rounded-2xl px-5 py-3.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all outline-none uppercase font-mono"
                    placeholder="PHX"
                  />
                  <p className="text-[9px] text-text-secondary/60 italic ml-1 italic">Short prefix for ticket IDs</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Client / Department</label>
                <div className="relative">
                  <Briefcase size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/50" />
                  <input
                    value={form.clientName}
                    onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                    className="w-full bg-bg-primary/50 border border-border-color rounded-2xl pl-12 pr-5 py-3.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all outline-none"
                    placeholder="Internal or External Client Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Description & Objective</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-bg-primary/50 border border-border-color rounded-2xl px-5 py-4 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all outline-none resize-none"
                  placeholder="Define the scope and mission of this project..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-card/40 border border-border-color p-8 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <Users size={16} className="text-accent" />
              Team Architecture
            </h3>
            
            <div className="space-y-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Scout for team members..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full bg-bg-primary/50 border border-border-color rounded-2xl pl-12 pr-5 py-3.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent transition-all outline-none"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-2xl border border-border-color bg-bg-primary/30 custom-scrollbar">
                {users.filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase())).map((u) => {
                  const isSelected = selectedMembers.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleMember(u.id)}
                      className={`flex cursor-pointer items-center justify-between px-5 py-3.5 transition-all hover:bg-accent/5 group ${isSelected ? "bg-accent/10 border-l-2 border-accent" : "border-l-2 border-transparent"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl overflow-hidden border-2 transition-all ${isSelected ? "border-accent scale-105" : "border-border-color"}`}>
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-black bg-bg-secondary text-text-secondary">
                              {u.name.split(" ").map(w => w[0]).join("")}
                            </div>
                          )}
                        </div>
                        <span className={`text-sm font-bold transition-colors ${isSelected ? "text-accent" : "text-text-primary"}`}>{u.name}</span>
                      </div>
                      <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? "bg-accent border-accent text-slate-950" : "border-border-color"}`}>
                        {isSelected && (
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Status & Media */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-card/40 border border-border-color p-8 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-6">Execution Phase</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Current Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Project["status"] }))}
                  className="w-full bg-bg-primary/50 border border-border-color rounded-2xl px-5 py-3.5 text-sm text-text-primary focus:border-accent transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="active">Active Operation</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-card/40 border border-border-color p-8 shadow-xl backdrop-blur-sm">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest mb-6">Project Branding</h3>
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="h-32 w-32 rounded-3xl border-2 border-dashed border-border-color hover:border-accent/40 transition-all bg-bg-primary/20 flex items-center justify-center overflow-hidden group relative">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <Layout size={40} className="text-text-secondary/20" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {!logoPreview && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10 backdrop-blur-sm">
                      <p className="text-[10px] font-black text-accent uppercase">Upload Logo</p>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-text-secondary text-center uppercase tracking-tighter font-bold">Recommended: Square SVG or PNG (512x512)</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-bg-primary/20 border border-border-color p-8 text-center space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-widest">Active Members</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {selectedMembers.map(id => {
                const user = users.find(u => u.id === id);
                if (!user) return null;
                return (
                  <div key={id} className="h-10 w-10 rounded-xl overflow-hidden border-2 border-border-color/50 ring-2 ring-transparent hover:ring-accent transition-all" title={user.name}>
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-bg-secondary text-[10px] font-black text-text-secondary">
                        {user.name.split(" ").map(w => w[0]).join("")}
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedMembers.length === 0 && (
                <p className="text-[10px] text-text-secondary/50 font-bold uppercase italic">No operatives assigned</p>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-[10px] font-black text-accent uppercase tracking-widest">{selectedMembers.length} Team Members</p>
            )}
          </div>

          {!isNew && (
            <div className="rounded-3xl bg-rose-500/5 border border-rose-500/20 p-8 space-y-4">
              <h3 className="text-xs font-black text-rose-500 uppercase tracking-widest">Danger Zone</h3>
              <p className="text-[10px] text-text-secondary leading-relaxed">Archiving this project will hide it from the active projects list and may affect ongoing tasks.</p>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Are you sure you want to archive this project?")) return;
                  setSaving(true);
                  try {
                    const res = await fetch(`/api/projects/${initialData?.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Failed to archive project");
                    toast.success("Project archived successfully!");
                    router.push("/projects");
                  } catch (e) {
                    console.error(e);
                    toast.error("Could not archive project.");
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl border border-rose-500/20 transition-all disabled:opacity-50"
              >
                Archive Project
              </button>
            </div>
          )}

          <div className="pt-4 flex flex-col gap-3">
             <button
              type="submit"
              disabled={saving}
              className="w-full bg-accent hover:bg-accent-hover text-slate-950 font-black uppercase tracking-widest text-xs py-4 rounded-2xl shadow-xl shadow-accent/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Processing..." : (isNew ? "Create Project" : "Update Project")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="w-full bg-bg-secondary text-text-secondary font-black uppercase tracking-widest text-xs py-4 rounded-2xl border border-border-color hover:text-text-primary transition-all"
            >
              Cancel Mission
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
