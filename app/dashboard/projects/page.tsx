"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Layout, Settings, Users, ArrowRight } from "lucide-react";

export default function ProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch("/api/projects");
            const result = await res.json();
            if (result.success) setProjects(result.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-12">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
                            <Layout size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase">Team <span className="text-accent">Projects</span></h1>
                            <p className="text-text-secondary font-bold uppercase tracking-widest text-[10px] mt-1">Manage your engineering workflows</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-accent text-text-primary hover:bg-accent-hover transition-all text-sm font-black shadow-xl shadow-accent/20">
                        <Plus size={20} />
                        <span>New Project</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {projects.map((project: any) => (
                            <Link
                                key={project._id}
                                href={`/dashboard/kanban/${project._id}`}
                                className="group relative rounded-3xl bg-bg-secondary/40 border border-border-color p-8 transition-all hover:border-accent/40 hover:bg-bg-secondary shadow-2xl overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <Layout size={80} className="text-text-primary" />
                                </div>

                                <div className="relative z-10 flex flex-col h-full gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="px-3 py-1 bg-bg-primary border border-border-color rounded-lg text-xs font-black text-accent uppercase tracking-widest">
                                            {project.key}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-black text-text-primary tracking-tight group-hover:text-accent transition-colors">{project.name}</h3>
                                        <p className="text-text-secondary text-sm mt-2 line-clamp-2 leading-relaxed">
                                            {project.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="flex-1" />

                                    <div className="flex items-center justify-between pt-6 border-t border-border-color">
                                        <div className="flex items-center -space-x-2">
                                            <div className="h-8 w-8 rounded-full bg-card-bg border-2 border-slate-950 animate-pulse" />
                                            <div className="h-8 w-8 rounded-full bg-bg-secondary border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-text-secondary">
                                                +{project.members?.length || 1}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-accent font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            Open Board
                                            <ArrowRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
