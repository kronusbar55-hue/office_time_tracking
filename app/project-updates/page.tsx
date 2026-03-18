"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    Search,
    Calendar,
    Briefcase,
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    FileText,
    ExternalLink,
    SearchX
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/auth/AuthProvider";

type ProjectUpdate = {
    projectId: string;
    projectName: string;
    update: string;
    hoursWorked: number;
};

type UpdateRecord = {
    _id: string;
    date: string;
    time: string;
    userId: string;
    userName: string;
    user: {
        _id: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    };
    projects: ProjectUpdate[];
};

export default function ProjectUpdateModule() {
    const { user: authUser } = useAuth();

    // Filters
    const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
    const [selectedUserId, setSelectedUserId] = useState<string>("all");
    const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

    const [viewMode, setViewMode] = useState<"feed" | "project" | "user">("feed");
    
    // Data
    const [updates, setUpdates] = useState<UpdateRecord[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

    // UI state
    const [userSearchText, setUserSearchText] = useState("");
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    // Fetch Initial Data (Users & Projects)
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [usersRes, projectsRes] = await Promise.all([
                    fetch("/api/users"),
                    fetch("/api/projects")
                ]);
                const usersData = await usersRes.json();
                const projectsData = await projectsRes.json();

                if (usersData.success) {
                    setUsers(usersData.data || []);
                } else if (Array.isArray(usersData)) {
                    setUsers(usersData);
                }

                if (projectsData.success) {
                    setProjects(projectsData.data || []);
                } else if (Array.isArray(projectsData)) {
                    setProjects(projectsData);
                }
            } catch (error) {
                console.error("Failed to fetch filters:", error);
            }
        };
        fetchInitial();
    }, []);

    // Fetch Updates
    const fetchUpdates = useCallback(async (page: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20", // Increased limit for better grouping
                month: selectedMonth,
                userId: selectedUserId,
                projectId: selectedProjectId
            });
            const res = await fetch(`/api/project-updates?${params}`);
            const json = await res.json();
            if (json.success) {
                // Filter the internal projects array if a specific project is selected
                const processedUpdates = json.data.updates.map((record: UpdateRecord) => ({
                    ...record,
                    projects: selectedProjectId === "all" 
                        ? record.projects 
                        : record.projects.filter(p => p.projectId === selectedProjectId)
                })).filter((record: UpdateRecord) => record.projects.length > 0);

                setUpdates(processedUpdates);
                setPagination(json.data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch updates:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedUserId, selectedProjectId]);

    useEffect(() => {
        fetchUpdates(1);
    }, [fetchUpdates]);

    // Handle clicks outside dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredUsers = users.filter(u =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchText.toLowerCase())
    ).slice(0, 8);

    const selectedUser = users.find(u => (u._id || u.id) === selectedUserId);

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            {/* Header */}
            <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                            <Briefcase className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent uppercase tracking-tighter">
                            Project <span className="text-white">Updates</span>
                        </h1>
                    </div>

                    {/* View Mode Switcher */}
                    <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 backdrop-blur-md shadow-inner">
                        <button 
                            onClick={() => setViewMode("feed")}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'feed' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Feed View
                        </button>
                        <button 
                            onClick={() => setViewMode("project")}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'project' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            By Project
                        </button>
                        <button 
                            onClick={() => setViewMode("user")}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            By Employee
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Advanced Filters */}
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-2xl relative transition-all ${showUserDropdown ? 'z-50 overflow-visible' : 'z-30 overflow-visible'}`}>
                    {/* User Selector with Search */}
                    <div className={`space-y-2 relative transition-all ${showUserDropdown ? 'z-50' : 'z-0'}`} ref={userDropdownRef}>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Employee Search</label>
                        <div
                            className="relative group cursor-pointer"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                        >
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <div className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white group-hover:border-blue-500/50 transition-all">
                                {selectedUserId === "all" ? "All Employees" : (selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "Select Employee")}
                            </div>
                        </div>

                        <AnimatePresence>
                            {showUserDropdown && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                >
                                    <div className="px-2 pt-1 pb-2 border-b border-slate-800 mb-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
                                            <input
                                                type="text"
                                                placeholder="Search name..."
                                                value={userSearchText}
                                                onChange={(e) => setUserSearchText(e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                                        <button
                                            className={`w-full p-3 rounded-xl text-left text-xs font-bold transition-all ${selectedUserId === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                            onClick={() => { setSelectedUserId("all"); setShowUserDropdown(false); }}
                                        >
                                            All Employees
                                        </button>
                                        {filteredUsers.map((u) => (
                                            <button
                                                key={u._id || u.id}
                                                className={`w-full p-3 rounded-xl text-left flex items-center gap-3 transition-all ${selectedUserId === (u._id || u.id) ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                                                onClick={() => { setSelectedUserId(u._id || u.id); setShowUserDropdown(false); setUserSearchText(""); }}
                                            >
                                                <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                                                    {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="h-3 w-3" />}
                                                </div>
                                                <span className="text-xs font-bold">{u.firstName} {u.lastName}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Month Filter */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Month Period</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    {/* Project Filter */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Target Project</label>
                        <div className="relative group">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full pl-11 pr-10 py-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Projects</option>
                                {projects.map((p) => (
                                    <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-slate-900/40 rounded-3xl border border-slate-800 p-12 flex flex-col items-center justify-center space-y-4"
                            >
                                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Compiling Activities...</p>
                            </motion.div>
                        ) : updates.length === 0 ? (
                            <motion.div 
                                key="empty"
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="bg-slate-900/40 rounded-3xl border border-slate-800 p-20 text-center"
                            >
                                <div className="flex flex-col items-center justify-center opacity-40">
                                    <SearchX className="h-16 w-16 mb-4 text-slate-600" />
                                    <p className="text-lg font-black uppercase tracking-widest">No Updates Found</p>
                                    <p className="text-sm font-medium text-slate-500 mt-2">Try adjusting your filters or selecting a different month.</p>
                                </div>
                            </motion.div>
                        ) : viewMode === "feed" ? (
                            <motion.div 
                                key="feed"
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-xl shadow-2xl"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-950/80 border-b border-slate-800">
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[180px]">Date & Time</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 w-[220px]">Employee</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Project Updates</th>
                                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right w-[120px]">Hours</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {updates.map((record) => (
                                                <tr key={record._id} className="group hover:bg-slate-800/20 transition-all">
                                                    <td className="p-6">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-white">{format(parseISO(record.date), "MMM dd, yyyy")}</span>
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 mt-1 uppercase tracking-tighter">
                                                                <Clock className="h-2.5 w-2.5" />
                                                                {record.time}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center ring-2 ring-transparent group-hover:ring-blue-500/30 transition-all">
                                                                {record.user?.avatarUrl ? (
                                                                    <img src={record.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <UserIcon className="h-5 w-5 text-slate-700" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-300 group-hover:text-blue-400 transition-colors">
                                                                    {record.userName}
                                                                </span>
                                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">ID: {record.userId.slice(-6).toUpperCase()}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="space-y-4">
                                                            {record.projects.map((p, idx) => (
                                                                <div key={idx} className="flex flex-col gap-1 border-l-2 border-blue-500/30 pl-4 py-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{p.projectName}</span>
                                                                        <span className="text-[9px] font-bold text-slate-600">#{p.projectId.slice(-6).toUpperCase()}</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-300 font-medium leading-relaxed italic">
                                                                        &quot;{p.update}&quot;
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-base font-black text-white">{record.projects.reduce((acc, p) => acc + (p.hoursWorked || 0), 0)}</span>
                                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Hrs Logged</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key={viewMode}
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {Object.entries(
                                    updates.reduce((acc, record) => {
                                        const key = viewMode === "project" 
                                            ? (record.projects[0]?.projectName || "Unassigned")
                                            : record.userName;
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(record);
                                        return acc;
                                    }, {} as Record<string, UpdateRecord[]>)
                                ).map(([groupName, groupUpdates]) => {
                                    const totalHours = groupUpdates.reduce((acc, r) => acc + r.projects.reduce((pa, p) => pa + p.hoursWorked, 0), 0);
                                    
                                    return (
                                        <div key={groupName} className="bg-slate-900/40 rounded-3xl border border-slate-800 overflow-hidden backdrop-blur-xl shadow-xl">
                                            <div className="bg-slate-950/50 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-8 w-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                                        {viewMode === "project" ? <Briefcase className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">{groupName}</h3>
                                                        <p className="text-[10px] font-bold text-slate-500">{groupUpdates.length} update sessions detected</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-lg font-black text-blue-400 leading-none">{totalHours.toFixed(1)}</div>
                                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Hours</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 space-y-6">
                                                {groupUpdates.map((record) => (
                                                    <div key={record._id} className="flex gap-6 items-start">
                                                        <div className="flex flex-col items-center pt-1 min-w-[60px]">
                                                            <span className="text-[10px] font-black text-white uppercase">{format(parseISO(record.date), "MMM dd")}</span>
                                                            <span className="text-[9px] font-bold text-slate-500">{record.time}</span>
                                                        </div>
                                                        <div className="flex-1 space-y-3">
                                                            {record.projects.map((p, idx) => (
                                                                <div key={idx} className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 hover:border-blue-500/20 transition-all">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            {viewMode === "project" && (
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] font-bold text-blue-400 overflow-hidden">
                                                                                        {record.user?.avatarUrl ? <img src={record.user.avatarUrl} alt="" /> : record.userName.charAt(0)}
                                                                                    </div>
                                                                                    <span className="text-[10px] font-bold text-slate-400">{record.userName}</span>
                                                                                </div>
                                                                            )}
                                                                            {viewMode === "user" && (
                                                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{p.projectName}</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] font-black text-slate-400 group-hover:text-blue-400 transition-colors uppercase">
                                                                            {p.hoursWorked} hrs
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm text-slate-300 font-medium italic border-l-2 border-slate-700 pl-4 py-1 leading-relaxed">
                                                                        &quot;{p.update}&quot;
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Pagination */}
                    {pagination.total > 0 && !loading && (
                        <div className="mt-8 p-6 bg-slate-900/40 rounded-3xl border border-slate-800 flex items-center justify-between backdrop-blur-xl shadow-xl">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Showing <span className="text-white">{(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-white">{pagination.total}</span> entries
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchUpdates(pagination.page - 1)}
                                    disabled={pagination.page <= 1 || loading}
                                    className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
                                        let pageNum = i + 1;
                                        if (pagination.pages > 5) {
                                            if (pagination.page > 3) pageNum = pagination.page - 3 + i;
                                            if (pageNum > pagination.pages) pageNum = pagination.pages - (4 - i);
                                        }
                                        if (pageNum <= 0) return null;

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => fetchUpdates(pageNum)}
                                                className={`h-9 w-9 rounded-xl border text-[10px] font-black transition-all ${pagination.page === pageNum ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-110' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => fetchUpdates(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.pages || loading}
                                    className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
