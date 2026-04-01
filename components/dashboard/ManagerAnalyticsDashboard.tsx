"use client";

import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  PieChart as PieChartIcon,
  RefreshCcw,
  Search,
  Table2,
  Users
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import DashboardCard from "./shared/DashboardCard";

type FilterOption = {
  id?: string;
  value?: string;
  name?: string;
  label?: string;
};

type FilterOptionsResponse = {
  projects: Array<{ id: string; name: string }>;
  assignees: Array<{ id: string; name: string }>;
  projectAssignees: Record<string, Array<{ id: string; name: string }>>;
  statuses: Array<{ value: string; label: string }>;
  priorities: Array<{ value: string; label: string }>;
};

type AnalyticsResponse = {
  teamStats: {
    rows: Array<{
      assigneeId: string;
      assigneeName: string;
      todo: number;
      inProgress: number;
      done: number;
      qa: number;
      total: number;
    }>;
    totals: {
      assigneeName: string;
      todo: number;
      inProgress: number;
      done: number;
      qa: number;
      total: number;
    };
  };
  bugStats: Array<{
    assigneeId: string;
    assigneeName: string;
    totalIssues: number;
    color: string;
  }>;
  platformStats: Array<{
    status: string;
    admin: number;
    app: number;
    total: number;
  }>;
  meta: {
    totalFilteredTasks: number;
    totalBugIssues: number;
  };
};

const filterSchema = z.object({
  projectIds: z.array(z.string()).default([]),
  statuses: z.array(z.string()).default([]),
  assigneeIds: z.array(z.string()).default([]),
  priorities: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

function useOutsideClick(ref: RefObject<HTMLDivElement>, onClose: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    function handleClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [enabled, onClose, ref]);
}

function FilterMultiSelect({
  label,
  placeholder,
  options,
  selectedValues,
  onChange,
  disabled,
  allowClearOption = true,
  multi = true
}: {
  label: string;
  placeholder: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  allowClearOption?: boolean;
  multi?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useOutsideClick(containerRef, () => setOpen(false), open);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;

    return options.filter((option) => {
      const text = String(option.label || option.name || option.value || option.id || "").toLowerCase();
      return text.includes(term);
    });
  }, [options, search]);

  const selectedLabels = useMemo(() => {
    return options
      .filter((option) => selectedValues.includes(String(option.value || option.id)))
      .map((option) => option.label || option.name || option.value || option.id || "");
  }, [options, selectedValues]);

  const buttonLabel =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]
        : `${selectedLabels.length} selected`;

  return (
    <div className="min-w-[180px] flex-1" ref={containerRef}>
      <div className={`relative ${open ? "z-[60]" : "z-10"}`}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((value) => !value)}
          className="flex h-12 w-full items-center justify-between rounded-lg border border-border-color bg-bg-primary/40 px-4 text-left text-sm font-medium text-text-primary transition hover:border-accent/60 hover:bg-card-bg/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="block truncate">{buttonLabel}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-text-secondary transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-xl border border-border-color bg-bg-secondary shadow-2xl">
            <div className="border-b border-border-color p-3">
              <div className="flex items-center gap-2 rounded-lg border border-border-color bg-bg-primary/50 px-3 py-2">
                <Search className="h-4 w-4 text-text-secondary" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={`Search ${label.toLowerCase()}`}
                  className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-2">
              {allowClearOption ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-text-primary transition hover:bg-card-bg/50"
                >
                  <span>{placeholder}</span>
                  {selectedValues.length === 0 ? <Check className="h-4 w-4 text-accent" /> : null}
                </button>
              ) : null}

              {filteredOptions.map((option) => {
                const value = String(option.value || option.id);
                const text = option.label || option.name || value;
                const checked = selectedValues.includes(value);

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (multi) {
                        onChange(checked ? selectedValues.filter((item) => item !== value) : [...selectedValues, value]);
                        return;
                      }

                      onChange(checked ? [] : [value]);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-text-primary transition hover:bg-card-bg/50"
                  >
                    <span className="truncate">{text}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        checked
                          ? "border-accent/60 bg-accent/15 text-accent"
                          : "border-border-color bg-bg-primary/40 text-transparent"
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-text-secondary">No results found.</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl border border-border-color/50 bg-bg-secondary/40 p-6">
          <div className="mb-4 h-6 w-56 animate-pulse rounded bg-border-color dark:bg-bg-secondary/60" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((__, cellIndex) => (
                  <div key={cellIndex} className="h-10 animate-pulse rounded-xl bg-border-color dark:bg-bg-secondary/50" />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border-color/50 bg-bg-secondary/40 p-6">
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-border-color dark:bg-bg-secondary/60" />
          <div className="mx-auto h-72 w-72 animate-pulse rounded-full bg-border-color dark:bg-bg-secondary/40" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-border-color/50 bg-bg-secondary/40 p-6">
          <div className="mb-4 h-6 w-44 animate-pulse rounded bg-border-color dark:bg-bg-secondary/60" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((__, cellIndex) => (
                  <div key={cellIndex} className="h-10 animate-pulse rounded-xl bg-border-color dark:bg-bg-secondary/50" />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border-color/50 bg-bg-secondary/40 p-6">
          <div className="mb-4 h-6 w-48 animate-pulse rounded bg-border-color dark:bg-bg-secondary/60" />
          <div className="h-80 animate-pulse rounded-2xl bg-border-color dark:bg-bg-secondary/40" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <DashboardCard className="p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 rounded-2xl border border-dashed border-accent/40 bg-accent/10 p-5 text-accent">
          <Filter className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Apply filters to view analytics</h2>
        <p className="mt-2 max-w-xl text-sm text-text-secondary">{message}</p>
      </div>
    </DashboardCard>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 className="flex items-center gap-2 text-[1.05rem] font-bold text-text-primary">
          {icon}
          {title}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
    </div>
  );
}

export default function ManagerAnalyticsDashboard() {
  const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse>({
    projects: [],
    assignees: [],
    projectAssignees: {},
    statuses: [],
    priorities: []
  });
  const [filters, setFilters] = useState({
    projectIds: [] as string[],
    statuses: [] as string[],
    assigneeIds: [] as string[],
    priorities: [] as string[],
    startDate: "",
    endDate: ""
  });
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadFilterOptions() {
      setLoadingFilters(true);
      try {
        const response = await fetch("/api/manager/analytics/filters", { cache: "no-store" });
        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(json.message || "Failed to load filters");
        }

        if (active) {
          setFilterOptions(json.data);
        }
      } catch (fetchError) {
        console.error(fetchError);
        if (active) {
          setError("Failed to load data");
        }
      } finally {
        if (active) {
          setLoadingFilters(false);
        }
      }
    }

    void loadFilterOptions();
    return () => {
      active = false;
    };
  }, []);

  const contributionBars = useMemo(() => {
    return (data?.bugStats || [])
      .filter((item) => item.totalIssues > 0)
      .map((item) => ({
        name: item.assigneeName,
        issues: item.totalIssues,
        color: item.color
      }));
  }, [data]);

  const availableAssigneeOptions = useMemo(() => {
    const selectedProjectId = filters.projectIds[0];
    if (!selectedProjectId) {
      return filterOptions.assignees;
    }

    return filterOptions.projectAssignees[selectedProjectId] || [];
  }, [filterOptions, filters.projectIds]);

  async function applyFilters() {
    const parsed = filterSchema.parse(filters);
    const params = new URLSearchParams();

    if (parsed.projectIds.length) params.set("projectId", parsed.projectIds.join(","));
    if (parsed.statuses.length) params.set("status", parsed.statuses.join(","));
    if (parsed.assigneeIds.length) params.set("assignee", parsed.assigneeIds.join(","));
    if (parsed.priorities.length) params.set("priority", parsed.priorities.join(","));
    if (parsed.startDate) params.set("startDate", parsed.startDate);
    if (parsed.endDate) params.set("endDate", parsed.endDate);

    setHasApplied(true);
    setError("");
    setLoadingAnalytics(true);

    try {
      const response = await fetch(`/api/manager/analytics?${params.toString()}`, {
        cache: "no-store"
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.message || "Failed to load data");
      }

      setData(json.data);
    } catch (fetchError) {
      console.error(fetchError);
      setData(null);
      setError("Failed to load data");
    } finally {
      setLoadingAnalytics(false);
    }
  }

  function clearFilters() {
    setFilters({
      projectIds: [],
      statuses: [],
      assigneeIds: [],
      priorities: [],
      startDate: "",
      endDate: ""
    });
    setData(null);
    setError("");
    setHasApplied(false);
    setLoadingAnalytics(false);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-accent">Manager Analytics</p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">Team analytics dashboard</h1>
        </div>

        <DashboardCard className="relative z-50 p-4" allowOverflow={true}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <FilterMultiSelect
              label="Project"
              placeholder="Select Project"
              options={filterOptions.projects}
              selectedValues={filters.projectIds}
              disabled={loadingFilters}
              allowClearOption={false}
              multi={false}
              onChange={(projectIds) =>
                setFilters((current) => ({
                  ...current,
                  projectIds: projectIds.slice(0, 1),
                  assigneeIds: []
                }))
              }
            />
            <FilterMultiSelect
              label="Status"
              placeholder="All Statuses"
              options={filterOptions.statuses}
              selectedValues={filters.statuses}
              disabled={loadingFilters}
              onChange={(statuses) => setFilters((current) => ({ ...current, statuses }))}
            />
            <FilterMultiSelect
              label="Assignee"
              placeholder="All Assignees"
              options={availableAssigneeOptions}
              selectedValues={filters.assigneeIds}
              disabled={loadingFilters || (filters.projectIds.length > 0 && availableAssigneeOptions.length === 0)}
              onChange={(assigneeIds) => setFilters((current) => ({ ...current, assigneeIds }))}
            />
            <FilterMultiSelect
              label="Priority"
              placeholder="All Priorities"
              options={filterOptions.priorities}
              selectedValues={filters.priorities}
              disabled={loadingFilters}
              onChange={(priorities) => setFilters((current) => ({ ...current, priorities }))}
            />

            <div className="flex flex-col gap-1.5 w-full">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((curr) => ({ ...curr, startDate: e.target.value }))}
                className="h-12 w-full rounded-lg border border-border-color bg-bg-primary/40 px-3 text-sm text-text-primary outline-none transition focus:border-accent/60"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((curr) => ({ ...curr, endDate: e.target.value }))}
                className="h-12 w-full rounded-lg border border-border-color bg-bg-primary/40 px-3 text-sm text-text-primary outline-none transition focus:border-accent/60"
              />
            </div>

            <button
              type="button"
              onClick={applyFilters}
              disabled={loadingFilters || loadingAnalytics}
              className="inline-flex h-12 items-center justify-center gap-2 w-full rounded-lg bg-accent px-5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={loadingFilters}
              className="inline-flex h-12 items-center justify-center gap-2 w-full rounded-lg border border-border-color bg-bg-primary/40 px-5 text-sm font-semibold text-text-primary transition hover:border-accent/60 hover:bg-card-bg/40 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
            >
              <RefreshCcw className="h-4 w-4" />
              Clear Filters
            </button>
          </div>
        </DashboardCard>
      </div>

      {error ? (
        <DashboardCard>
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Failed to load data</p>
              <p className="text-sm text-rose-100/80">Please review the filters and try again.</p>
            </div>
          </div>
        </DashboardCard>
      ) : null}

      {loadingAnalytics ? <AnalyticsSkeleton /> : null}

      {!loadingAnalytics && !hasApplied ? (
        <EmptyState message="Use the project, status, assignee, or priority filters above, then click Apply Filters to render the analytics dashboard." />
      ) : null}

      {!loadingAnalytics && hasApplied && !error && data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardCard className="rounded-2xl border border-border-color bg-bg-secondary/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Total Filtered Tasks</p>
              <p className="mt-1 text-2xl font-black text-accent">{data.meta.totalFilteredTasks}</p>
            </DashboardCard>
            <DashboardCard className="rounded-2xl border border-border-color bg-bg-secondary/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Total Bug Issues</p>
              <p className="mt-1 text-2xl font-black text-rose-500">{data.meta.totalBugIssues}</p>
            </DashboardCard>
            <DashboardCard className="rounded-2xl border border-border-color bg-bg-secondary/40 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Team Members</p>
              <p className="mt-1 text-2xl font-black text-text-primary">{availableAssigneeOptions.length}</p>
            </DashboardCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_1fr]">
            <DashboardCard className="border-t-[4px] border-t-accent bg-bg-secondary/55 p-6">
              <SectionHeader
                icon={<Table2 className="h-5 w-5 text-accent" />}
                title="Team Members Track"
                subtitle="Task counts by assignee across delivery stages."
              />

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-text-secondary">
                    <tr>
                      <th className="border-b border-border-color px-2 py-3">Assignee</th>
                      <th className="border-b border-border-color px-2 py-3"><span className="rounded bg-card-bg/70 px-1.5 py-0.5 text-text-primary">TO DO</span></th>
                      <th className="border-b border-border-color px-2 py-3"><span className="rounded bg-accent/15 px-1.5 py-0.5 text-accent">IN PROGRESS</span></th>
                      <th className="border-b border-border-color px-2 py-3"><span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400">DONE</span></th>
                      <th className="border-b border-border-color px-2 py-3"><span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-400">QA</span></th>
                      <th className="border-b border-border-color px-2 py-3">T:</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.teamStats.rows.map((row) => (
                      <tr key={row.assigneeId} className="text-text-primary">
                        <td className="border-b border-border-color/70 px-2 py-3">{row.assigneeName}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 text-accent">{row.todo}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 text-accent">{row.inProgress}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 text-accent">{row.done}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 text-accent">{row.qa}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 font-bold text-accent">{row.total}</td>
                      </tr>
                    ))}
                    <tr className="bg-card-bg/40 font-bold text-text-primary">
                      <td className="border-b border-border-color px-2 py-3">Total Unique Issues:</td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">{data.teamStats.totals.todo}</td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">{data.teamStats.totals.inProgress}</td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">{data.teamStats.totals.done}</td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">{data.teamStats.totals.qa}</td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">{data.teamStats.totals.total}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
                <span>Grouped by: Status</span>
                <span>Showing {data.teamStats.rows.length} of {data.teamStats.rows.length} statistics.</span>
              </div>
              <div className="mt-5 flex items-center gap-2 text-sm text-text-secondary">
                <Clock3 className="h-4 w-4" />
                Last refreshed just now
              </div>
            </DashboardCard>

            <DashboardCard className="border-t-[4px] border-t-accent bg-bg-secondary/55 p-6">
              <SectionHeader
                icon={<PieChartIcon className="h-5 w-5 text-accent" />}
                title="Bugs Statistics"
                subtitle="Filtered bug issues grouped by assignee."
              />

              {data.bugStats.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border-color bg-bg-primary/20 p-6 text-center text-sm text-text-secondary">
                  No bug issues found for the selected filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.95fr]">
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.bugStats.filter(item => item.totalIssues > 0)}
                          innerRadius={68}
                          outerRadius={132}
                          paddingAngle={2}
                          dataKey="totalIssues"
                          nameKey="assigneeName"
                        >
                          {data.bugStats.filter(item => item.totalIssues > 0).map((item) => (
                            <Cell key={item.assigneeId} fill={item.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.96)",
                            border: "1px solid rgba(51, 65, 85, 1)",
                            borderRadius: 12,
                            color: "#f8fafc"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="pt-2">
                    <p className="text-2xl font-bold text-text-primary">Assignee</p>
                    <p className="text-sm text-text-secondary">
                      Total Issues: <span className="font-semibold">{data.meta.totalBugIssues}</span>
                    </p>
                    <div className="mt-3 border-t border-border-color" />
                    <div className="mt-4 space-y-4">
                      {data.bugStats.map((item) => (
                        <div key={item.assigneeId} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-[1rem] text-text-primary">{item.assigneeName}</span>
                          </div>
                          <span className="text-[1rem] text-text-secondary">{item.totalIssues}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </DashboardCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
            <DashboardCard className="border-t-[4px] border-t-accent bg-bg-secondary/55 p-6">
              <SectionHeader
                icon={<BarChart3 className="h-5 w-5 text-accent" />}
                title="Platform Wise Overview"
                subtitle="Status totals split across admin and app platforms."
              />

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-[0.14em] text-text-secondary">
                    <tr>
                      <th className="border-b border-border-color px-2 py-3">Status</th>
                      <th className="border-b border-border-color px-2 py-3">Admin</th>
                      <th className="border-b border-border-color px-2 py-3">app</th>
                      <th className="border-b border-border-color px-2 py-3">T:</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.platformStats.map((row) => (
                      <tr key={row.status} className="text-text-primary">
                        <td className="border-b border-border-color/70 px-2 py-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[12px] ${
                              row.status === "Done"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : row.status === "QA"
                                  ? "bg-blue-500/15 text-blue-400"
                                  : row.status === "In Progress"
                                    ? "bg-accent/15 text-accent"
                                    : "bg-card-bg/70 text-text-primary"
                            }`}
                          >
                            {row.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="border-b border-border-color/70 px-2 py-3 text-accent">{row.admin}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 text-accent">{row.app}</td>
                        <td className="border-b border-border-color/70 px-2 py-3 font-bold text-accent">{row.total}</td>
                      </tr>
                    ))}
                    <tr className="bg-card-bg/40 font-bold text-text-primary">
                      <td className="border-b border-border-color px-2 py-3">Total Unique Issues:</td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">
                        {data.platformStats.reduce((sum, item) => sum + item.admin, 0)}
                      </td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">
                        {data.platformStats.reduce((sum, item) => sum + item.app, 0)}
                      </td>
                      <td className="border-b border-border-color px-2 py-3 text-accent">
                        {data.platformStats.reduce((sum, item) => sum + item.total, 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
                <span>Grouped by: Labels</span>
                <span>Showing {data.platformStats.length} of {data.platformStats.length} statistics.</span>
              </div>
            </DashboardCard>

            <DashboardCard className="border-t-[4px] border-t-accent bg-bg-secondary/55 p-6">
              <SectionHeader
                icon={<Users className="h-5 w-5 text-accent" />}
                title="Assignee Contribution"
                subtitle="Total issues per assignee with chart-matched colors."
              />

              {contributionBars.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-border-color bg-bg-primary/20 p-6 text-center text-sm text-text-secondary">
                  Apply a broader filter set to compare assignee contribution.
                </div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contributionBars}>
                      <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis stroke="#94a3b8" width={70} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(15, 23, 42, 0.96)",
                          border: "1px solid rgba(51, 65, 85, 1)",
                          borderRadius: 12,
                          color: "#f8fafc"
                        }}
                      />
                      <Bar dataKey="issues" radius={[8, 8, 0, 0]}>
                        {contributionBars.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </DashboardCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
