"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProjectForm from "@/components/projects/ProjectForm";
import { Layout } from "lucide-react";

export default function EditProjectPage() {
  const { id } = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (!id) return;
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) throw new Error("Failed to load project");
        const data = await res.json();
        setProject(data);
      } catch (e) {
        console.error(e);
        setError("Could not load project data.");
      } finally {
        setLoading(false);
      }
    }
    void loadProject();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full border-4 border-accent border-t-transparent animate-spin shadow-xl shadow-accent/20" />
          <p className="text-text-secondary font-black uppercase tracking-widest text-[10px]">Retrieving Project Specs...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center pt-24 px-8 text-center space-y-6">
         <div className="h-24 w-24 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
            <Layout size={48} />
         </div>
         <div>
            <h2 className="text-2xl font-black text-rose-500 uppercase tracking-tighter">Mission Error</h2>
            <p className="text-text-secondary text-sm mt-1">{error || "Project data not found"}</p>
         </div>
         <button 
           onClick={() => window.location.href = "/projects"}
           className="px-8 py-3 rounded-2xl bg-bg-secondary text-text-primary border border-border-color font-black uppercase text-xs tracking-widest hover:bg-bg-primary"
         >
           Return to Base
         </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary p-8 pt-24">
      <ProjectForm initialData={project} isNew={false} />
    </div>
  );
}
