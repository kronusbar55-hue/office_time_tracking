"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskModal from "@/components/tasks/TaskModal";
import TaskTable from "@/components/tasks/TaskTable";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterProject, setFilterProject] = useState<string | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string | "all">("all");
  const [filterPriority, setFilterPriority] = useState<string | "all">("all");
  const [me, setMe] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function loadList() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject && filterProject !== "all") params.set("project", filterProject);
        if (filterStatus && filterStatus !== "all") params.set("status", filterStatus.toLowerCase());
      if (filterAssignee && filterAssignee !== "all") params.set("assignee", filterAssignee);
      if (filterPriority && filterPriority !== "all") params.set("priority", filterPriority);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) {
        console.error("Failed to load tasks", res.status);
        setTasks([]);
        return;
      }
      const json = await res.json();
      setTasks(json.data || []);
    } catch (e) {
      console.error(e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilterData() {
    setLoadingFilters(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        fetch("/api/projects?forCurrentUser=true"),
        fetch("/api/tasks?limit=1000")
      ]);

      if (projRes.ok) {
        const p = await projRes.json();
        setProjects(p || []);
      }

      if (tasksRes.ok) {
        const t = await tasksRes.json();
        const allTasks = t.data || [];
        // Extract unique assignees from tasks
        const assigneeMap = new Map();
        allTasks.forEach((task: any) => {
          if (task.assignee && task.assignee._id) {
            assigneeMap.set(task.assignee._id, {
              id: task.assignee._id,
              firstName: task.assignee.firstName,
              lastName: task.assignee.lastName
            });
          }
        });
        setAssignees(Array.from(assigneeMap.values()));
      }
    } catch (e) {
      console.error("Failed to load filter data:", e);
    } finally {
      setLoadingFilters(false);
    }
  }

  // Load filter data on mount
  useEffect(() => {
    void loadFilterData();
  }, []);

  // Load tasks when filters change
  useEffect(() => {
    void loadList();
  }, [filterProject, filterStatus, filterAssignee, filterPriority]);

  // initialize filters from URL and load data in background; do not block initial render
  useEffect(() => {
    const fp = searchParams?.get("project");
    const fs = searchParams?.get("status");
    const fa = searchParams?.get("assignee");
    const fq = searchParams?.get("priority");
    if (fp) setFilterProject(fp);
    if (fs) setFilterStatus(fs);
    if (fa) setFilterAssignee(fa);
    if (fq) setFilterPriority(fq);

    // fetch current user
    let mounted = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const meR = await meRes.json();
        if (!mounted) return;
        setMe(meR?.user || null);
        if (meR?.user?.role === "employee") {
          setFilterAssignee(meR.user.id);
        }
      } catch (e) {
        console.error(e);
      }
    })();

    return () => { mounted = false };
  // only run on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // group tasks by project for employee view
  const grouped = tasks.reduce((acc: Record<string, any>, t) => {
    const projName = t.project?.name || "Unassigned Project";
    if (!acc[projName]) acc[projName] = [];
    acc[projName].push(t);
    return acc;
  }, {});

  function openCreate() {
    setShowModal(true);
  }

  function handleSaved(task: any) {
    void loadList();
  }

  async function handleDelete(task: any) {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setTasks((t) => t.filter((x) => x._id !== task._id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete task");
    }
  }

  async function handleStatusChange(taskId: string, status: string) {
    // optimistic UI
    const prev = tasks.slice();
    setTasks((t) => t.map((x) => (x._id === taskId ? { ...x, status } : x)));
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error("Failed to update status");
    } catch (e) {
      console.error(e);
      setTasks(prev);
      alert("Failed to update status");
    }
  }

  function openDetail(task: any) {
    setDetailId(task._id);
    setDetailOpen(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-50">Tasks</h1>
        <div>
          {me && (me.role === "admin" || me.role === "manager") && (
            <button onClick={openCreate} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-900">Create Task</button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value as any); const p = new URLSearchParams(window.location.search); if (e.target.value === 'all') p.delete('project'); else p.set('project', e.target.value); router.replace(`${window.location.pathname}?${p.toString()}`, { shallow: true }); }} className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
          <option value="all">All Projects</option>
          {projects.map((proj: any) => (
            <option key={proj.id} value={proj.id}>{proj.name}</option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as any); const p = new URLSearchParams(window.location.search); if (e.target.value === 'all') p.delete('status'); else p.set('status', e.target.value); router.replace(`${window.location.pathname}?${p.toString()}`, { shallow: true }); }} className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
          <option value="all">All Statuses</option>
          <option value="backlog">Backlog</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>

        <select value={filterAssignee} onChange={(e) => { setFilterAssignee(e.target.value as any); const p = new URLSearchParams(window.location.search); if (e.target.value === 'all') p.delete('assignee'); else p.set('assignee', e.target.value); router.replace(`${window.location.pathname}?${p.toString()}`, { shallow: true }); }} className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
          <option value="all">All Assignees</option>
          {assignees.map((user: any) => (
            <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
          ))}
        </select>

        <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value as any); const p = new URLSearchParams(window.location.search); if (e.target.value === 'all') p.delete('priority'); else p.set('priority', e.target.value); router.replace(`${window.location.pathname}?${p.toString()}`, { shallow: true }); }} className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100">
          <option value="all">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
      </div>

      {me?.role === "employee" ? (
        <div className="mt-4 space-y-6">
          {Object.keys(grouped).map((proj) => (
            <div key={proj} className="rounded-md border border-slate-800/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">{proj}</h2>
                <div className="text-xs text-slate-400">{grouped[proj].length} task(s)</div>
              </div>
              <TaskTable tasks={grouped[proj]} loading={loading} onDelete={handleDelete} onStatusChange={handleStatusChange} user={me} />
            </div>
          ))}
        </div>
      ) : (
        <TaskTable tasks={tasks} loading={loading} onDelete={handleDelete} onStatusChange={handleStatusChange} user={me} />
      )}

      <TaskModal open={showModal} onClose={() => setShowModal(false)} onSaved={handleSaved} />
    </div>
  );
}


