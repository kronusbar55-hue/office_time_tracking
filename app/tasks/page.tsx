"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import TaskModal from "@/components/tasks/TaskModal";
import TaskTable from "@/components/tasks/TaskTable";
import { Search } from "lucide-react";

function TasksPageContent() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [draftProject, setDraftProject] = useState<string | "all">("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string | "all">("all");
  const [draftAssignee, setDraftAssignee] = useState<string | "all">("all");
  const [draftPriority, setDraftPriority] = useState<string | "all">("all");
  const [appliedFilters, setAppliedFilters] = useState<{
    project: string | "all";
    status: string | "all";
    assignee: string | "all";
    priority: string | "all";
  } | null>(null);
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
    if (!appliedFilters) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
      setHasMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (appliedFilters.project && appliedFilters.project !== "all") params.set("project", appliedFilters.project);
      if (appliedFilters.status && appliedFilters.status !== "all") params.set("status", appliedFilters.status.toLowerCase());
      if (appliedFilters.assignee && appliedFilters.assignee !== "all") params.set("assignee", appliedFilters.assignee);
      if (appliedFilters.priority && appliedFilters.priority !== "all") params.set("priority", appliedFilters.priority);
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
  }, [appliedFilters]);

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

  // Load tasks only after filters are explicitly applied
  useEffect(() => {
    if (!appliedFilters) return;
    setTotalTasks(0);
    void loadList(1, false);
  }, [appliedFilters, loadList]);

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
    if (fp) setDraftProject(fp);
    if (fs) setDraftStatus(fs);
    if (fa) setDraftAssignee(fa);
    if (fq) setDraftPriority(fq);

    // hydrate from AuthProvider instead of calling /api/auth/me directly
    setMe(user || null);
    if (user?.role === "employee") setDraftAssignee(user.id);
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

  const filteredProjects = useMemo(
    () =>
      projects.filter((proj: any) =>
        String(proj.name || "").toLowerCase().includes(projectSearch.toLowerCase())
      ),
    [projects, projectSearch]
  );

  const selectedProject = projects.find((proj: any) => proj.id === draftProject);
  const projectButtonLabel = draftProject === "all" ? "All Projects" : selectedProject?.name || "Select Project";

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

  function applyFilters() {
    const nextFilters = {
      project: draftProject,
      status: draftStatus,
      assignee: draftAssignee,
      priority: draftPriority
    };

    setTasks([]);
    setCurrentPage(1);
    setHasMore(true);
    setTotalTasks(0);
    setAppliedFilters(nextFilters);

    const params = new URLSearchParams();
    if (nextFilters.project !== "all") params.set("project", nextFilters.project);
    if (nextFilters.status !== "all") params.set("status", nextFilters.status);
    if (nextFilters.assignee !== "all") params.set("assignee", nextFilters.assignee);
    if (nextFilters.priority !== "all") params.set("priority", nextFilters.priority);
    router.replace(`${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function clearFilters() {
    const employeeDefault = me?.role === "employee" ? (me.id as string) : "all";
    setDraftProject("all");
    setProjectSearch("");
    setProjectDropdownOpen(false);
    setDraftStatus("all");
    setDraftAssignee(employeeDefault);
    setDraftPriority("all");
    setAppliedFilters(null);
    setTasks([]);
    setCurrentPage(1);
    setHasMore(true);
    setTotalTasks(0);
    router.replace(window.location.pathname);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between p-6 pb-4">
        <h1 className="text-lg font-semibold text-text-primary">Tasks</h1>
      </div>

      <div className="px-6 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
            >
              <span className="truncate">{projectButtonLabel}</span>
              <Search className="h-4 w-4 text-text-secondary" />
            </button>

            {projectDropdownOpen ? (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-border-color bg-bg-primary shadow-xl">
                <div className="border-b border-border-color p-2">
                  <div className="flex items-center gap-2 rounded-md border border-border-color bg-bg-primary/70 px-3 py-2">
                    <Search className="h-4 w-4 text-text-secondary" />
                    <input
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects"
                      className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftProject("all");
                      setProjectDropdownOpen(false);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-hover-bg"
                  >
                    All Projects
                  </button>
                  {filteredProjects.map((proj: any) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setDraftProject(proj.id);
                        setProjectDropdownOpen(false);
                      }}
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-text-primary hover:bg-hover-bg"
                    >
                      {proj.name}
                    </button>
                  ))}
                  {!filteredProjects.length ? (
                    <div className="px-3 py-2 text-sm text-text-secondary">No projects found</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <select
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value as any)}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="qa">QA</option>
            <option value="done">Done</option>
          </select>

          <select
            value={draftAssignee}
            onChange={(e) => setDraftAssignee(e.target.value as any)}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Assignees</option>
            {assignees.map((user: any) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>

          <select
            value={draftPriority}
            onChange={(e) => setDraftPriority(e.target.value as any)}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <button
            onClick={applyFilters}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-slate-900"
          >
            Apply Filters
          </button>

          <button
            onClick={clearFilters}
            className="rounded-md border border-border-color bg-bg-primary/60 px-3 py-2 text-sm font-medium text-text-primary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 pb-6"
      >
        {me?.role === "employee" ? (
          <div className="space-y-6">
            {!appliedFilters && !loading ? (
              <div className="rounded-md border border-border-color/40 p-6 text-sm text-text-secondary">
                Select filters and click Apply Filters to load tasks.
              </div>
            ) : null}
            {appliedFilters ? Object.keys(grouped).map((proj) => (
              <div key={proj} className="rounded-md border border-border-color/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text-primary">{proj}</h2>
                  <div className="text-xs text-text-secondary">{grouped[proj].length} task(s)</div>
                </div>
                <TaskTable tasks={grouped[proj]} loading={loading} onDelete={handleDelete} onStatusChange={handleStatusChange} onEdit={handleEdit} user={me} />
              </div>
            )) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {!appliedFilters && !loading ? (
              <div className="rounded-md border border-border-color/40 p-6 text-sm text-text-secondary">
                Select filters and click Apply Filters to load tasks.
              </div>
            ) : null}
            {appliedFilters ? (
              <TaskTable tasks={tasks} loading={loading} onDelete={handleDelete} onStatusChange={handleStatusChange} onEdit={handleEdit} user={me} />
            ) : null}
            
            {appliedFilters && loadingMore ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                <span className="ml-2 text-sm text-text-secondary">Loading more tasks...</span>
              </div>
            ) : null}
            
            {appliedFilters && !hasMore && tasks.length > 0 && !loading ? (
              <div className="text-center py-4 text-text-secondary text-sm">
                No more tasks to load
              </div>
            ) : null}
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

