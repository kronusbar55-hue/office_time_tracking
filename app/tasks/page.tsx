"use client";

import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import TaskModal from "@/components/tasks/TaskModal";
import TaskTable from "@/components/tasks/TaskTable";

function TasksPageContent() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterProject, setFilterProject] = useState<string | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string | "all">("all");
  const [filterAssignee, setFilterAssignee] = useState<string | "all">("all");
  const [filterPriority, setFilterPriority] = useState<string | "all">("all");
  const [me, setMe] = useState<any | null>(null);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);

  // Update hasMore when tasks or totalTasks change
  useEffect(() => {
    setHasMore(tasks.length < totalTasks);
  }, [tasks.length, totalTasks]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async (page: number = 1, append: boolean = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
      setHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (filterProject && filterProject !== "all") params.set("project", filterProject);
        if (filterStatus && filterStatus !== "all") params.set("status", filterStatus.toLowerCase());
      if (filterAssignee && filterAssignee !== "all") params.set("assignee", filterAssignee);
      if (filterPriority && filterPriority !== "all") params.set("priority", filterPriority);
      params.set("page", page.toString());
      params.set("limit", "25"); // Load 25 tasks at a time

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) {
        console.error("Failed to load tasks", res.status);
        if (!append) setTasks([]);
        return;
      }
      const json = await res.json();
      const newTasks = json.data || [];
      const total = json.total || 0;

      if (append) {
        setTasks(prev => [...prev, ...newTasks]);
        setCurrentPage(page);
      } else {
        setTasks(newTasks);
        setCurrentPage(1);
        setTotalTasks(total);
      }
    } catch (e) {
      console.error(e);
      if (!append) setTasks([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterProject, filterStatus, filterAssignee, filterPriority, tasks.length]);

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

  // Load tasks when filters change (reset pagination)
  useEffect(() => {
    setTotalTasks(0);
    void loadList(1, false);
  }, [filterProject, filterStatus, filterAssignee, filterPriority]);

  // Scroll handler for infinite scroll (only for admin/manager)
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loadingMore || !hasMore || me?.role === "employee") return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Load more when user scrolls within 200px of bottom
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      void loadList(currentPage + 1, true);
    }
  }, [loadingMore, hasMore, currentPage, loadList, me?.role]);

  // Add scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

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

    // hydrate from AuthProvider instead of calling /api/auth/me directly
    setMe(user || null);
    if (user?.role === "employee") setFilterAssignee(user.id);
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
    setEditingTask(null);
    setShowModal(true);
  }

  function handleEdit(task: any) {
    setEditingTask(task);
    setShowModal(true);
  }

  function handleSaved(task: any) {
    // Refresh the list when a task is saved
    void loadList(1, false);
    setShowModal(false);
    setEditingTask(null);
  }

  async function handleDelete(task: any) {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      // Remove from local state
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between p-6 pb-4">
        <h1 className="text-lg font-semibold text-text-primary">Tasks</h1>
        <div>
          {me && (me.role === "admin" || me.role === "manager") && (
            <button onClick={openCreate} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-900">Create Task</button>
          )}
        </div>
      </div>

      <div className="px-6 pb-4">
        <div className="flex items-center gap-3">
          <select
            value={filterProject}
            onChange={(e) => {
              setFilterProject(e.target.value as any);
              const p = new URLSearchParams(window.location.search);
              if (e.target.value === "all") p.delete("project");
              else p.set("project", e.target.value);
              router.replace(`${window.location.pathname}?${p.toString()}`);
            }}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Projects</option>
            {projects.map((proj: any) => (
              <option key={proj.id} value={proj.id}>{proj.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              const p = new URLSearchParams(window.location.search);
              if (e.target.value === "all") p.delete("status");
              else p.set("status", e.target.value);
              router.replace(`${window.location.pathname}?${p.toString()}`);
            }}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="qa">QA</option>
            <option value="done">Done</option>
          </select>

          <select
            value={filterAssignee}
            onChange={(e) => {
              setFilterAssignee(e.target.value as any);
              const p = new URLSearchParams(window.location.search);
              if (e.target.value === "all") p.delete("assignee");
              else p.set("assignee", e.target.value);
              router.replace(`${window.location.pathname}?${p.toString()}`);
            }}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Assignees</option>
            {assignees.map((user: any) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value as any);
              const p = new URLSearchParams(window.location.search);
              if (e.target.value === "all") p.delete("priority");
              else p.set("priority", e.target.value);
              router.replace(`${window.location.pathname}?${p.toString()}`);
            }}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 pb-6"
      >
        {me?.role === "employee" ? (
          <div className="space-y-6">
            {Object.keys(grouped).map((proj) => (
              <div key={proj} className="rounded-md border border-border-color/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text-primary">{proj}</h2>
                  <div className="text-xs text-text-secondary">{grouped[proj].length} task(s)</div>
                </div>
                <TaskTable tasks={grouped[proj]} loading={loading} onDelete={handleDelete} onStatusChange={handleStatusChange} onEdit={handleEdit} user={me} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <TaskTable tasks={tasks} loading={loading} onDelete={handleDelete} onStatusChange={handleStatusChange} onEdit={handleEdit} user={me} />
            
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                <span className="ml-2 text-sm text-text-secondary">Loading more tasks...</span>
              </div>
            )}
            
            {!hasMore && tasks.length > 0 && !loading && (
              <div className="text-center py-4 text-text-secondary text-sm">
                No more tasks to load
              </div>
            )}
          </div>
        )}
      </div>

      <TaskModal 
        open={showModal} 
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }} 
        onSaved={handleSaved} 
        initial={editingTask}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-text-secondary">Loading tasks...</div>}>
      <TasksPageContent />
    </Suspense>
  );
}

