"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarRange,
  Clock3,
  Flame,
  Info,
  RefreshCcw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import DashboardCard from "./shared/DashboardCard";
import StatsCard from "./shared/StatsCard";

type OverviewResponse = {
  totalEmployees: number;
  activeEmployeesToday: number;
  averageProductivityScore: number;
  totalActiveTimeSeconds: number;
  totalFocusTimeSeconds: number;
  dateRangeLabel: string;
  departments: string[];
};

type ProductivityResponse = {
  daily: Array<{ date: string; productivityScore: number; activeTimeHours: number; focusTimeHours: number; interactionScore: number; activeEmployees: number }>;
  weekly: Array<{ week: string; productivityScore: number; activeTimeHours: number; focusTimeHours: number; interactionScore: number; activeEmployees: number }>;
  employeeComparison: Array<{ employeeId: string; name: string; department: string; productivityScore: number; activeTimeHours: number; focusTimeHours: number }>;
  heatmap: Array<{ dayOfWeek: number; dayLabel: string; hour: number; productivity: number; activeSeconds: number }>;
};

type EmployeesResponse = {
  rows: Array<{ employeeId: string; name: string; department: string; activeTime: string; focusTime: string; productivityScore: number; interactionScore: number; status: "Active" | "Needs Attention" | "Inactive"; bestWorkingHour: string; irregularPatterns: number }>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type BehaviorResponse = {
  bestWorkingHours: Array<{ hour: number; label: string; productivity: number }>;
  lowProductivityHours: Array<{ hour: number; label: string; productivity: number }>;
  peakActivityTime: { hour: number; label: string; activeTimeHours: number } | null;
  irregularWorkingPatterns: Array<{ employeeId: string; name: string; department: string; irregularActivityCount: number; frequentBreaks: number; contextSwitches: number }>;
};

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  department?: string;
};

const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "60days", label: "Last 60 Days" },
  { value: "custom", label: "Custom Range" }
] as const;

type DateRangePreset = (typeof DATE_RANGE_OPTIONS)[number]["value"];

function getDefaultDates() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0]
  };
}

function formatSecondsToHours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function heatColor(score: number) {
  if (score >= 80) return "bg-emerald-500/80";
  if (score >= 60) return "bg-sky-500/75";
  if (score >= 40) return "bg-amber-500/70";
  if (score > 0) return "bg-rose-500/70";
  return "bg-slate-800/40";
}

function getPresetDates(preset: DateRangePreset) {
  const today = new Date();
  const start = new Date(today);

  if (preset === "today") {
    return {
      startDate: today.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0]
    };
  }

  if (preset === "30days") {
    start.setDate(today.getDate() - 29);
  } else if (preset === "60days") {
    start.setDate(today.getDate() - 59);
  } else {
    start.setDate(today.getDate() - 6);
  }

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: today.toISOString().split("T")[0]
  };
}

function AnalyticsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <DashboardCard key={`metric-${index}`} className="overflow-hidden">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-11 w-11 rounded-2xl bg-sky-500/15" />
                <div className="h-3 w-14 rounded-full bg-white/10" />
              </div>
              <div className="h-3 w-24 rounded-full bg-white/10" />
              <div className="h-8 w-20 rounded-xl bg-white/10" />
              <div className="h-3 w-28 rounded-full bg-white/10" />
            </div>
          </DashboardCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <DashboardCard key={`chart-${index}`}>
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded-full bg-white/10" />
                  <div className="h-3 w-56 rounded-full bg-white/10" />
                </div>
                <div className="h-8 w-8 rounded-full bg-white/10" />
              </div>
              <div className="h-64 rounded-2xl bg-gradient-to-br from-sky-500/10 via-white/5 to-emerald-500/10" />
            </div>
          </DashboardCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DashboardCard>
          <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-44 rounded-full bg-white/10" />
                <div className="h-3 w-64 rounded-full bg-white/10" />
              </div>
              <div className="h-3 w-20 rounded-full bg-white/10" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, row) => (
                <div key={`row-${row}`} className="grid grid-cols-6 gap-3 rounded-xl bg-white/[0.04] p-3">
                  {Array.from({ length: 6 }, (_, cell) => (
                    <div key={`cell-${row}-${cell}`} className="h-4 rounded-full bg-white/10" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard>
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-36 rounded-full bg-white/10" />
            <div className="h-3 w-48 rounded-full bg-white/10" />
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`pattern-${index}`} className="space-y-2 rounded-xl bg-white/[0.04] p-4">
                <div className="h-4 w-24 rounded-full bg-white/10" />
                <div className="h-3 w-20 rounded-full bg-white/10" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-10 rounded-lg bg-white/10" />
                  <div className="h-10 rounded-lg bg-white/10" />
                  <div className="h-10 rounded-lg bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded-full bg-white/10" />
              <div className="h-3 w-52 rounded-full bg-white/10" />
            </div>
            <div className="h-3 w-16 rounded-full bg-white/10" />
          </div>
          <div className="grid grid-cols-[80px_repeat(14,minmax(28px,1fr))] gap-2">
            {Array.from({ length: 7 * 15 }, (_, index) => (
              <div key={`heat-${index}`} className="h-8 rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

export default function AdminAnalyticsDashboard() {
  const defaults = useMemo(() => getDefaultDates(), []);
  const [datePreset, setDatePreset] = useState<DateRangePreset>("7days");
  const [draftStartDate, setDraftStartDate] = useState(defaults.startDate);
  const [draftEndDate, setDraftEndDate] = useState(defaults.endDate);
  const [draftEmployeeId, setDraftEmployeeId] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<{
    startDate: string;
    endDate: string;
    employeeId: string;
  } | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [productivity, setProductivity] = useState<ProductivityResponse | null>(null);
  const [employeeTable, setEmployeeTable] = useState<EmployeesResponse | null>(null);
  const [behavior, setBehavior] = useState<BehaviorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const params = new URLSearchParams({
          paginate: "true",
          page: "1",
          limit: "5",
          ...(employeeSearchQuery ? { search: employeeSearchQuery } : {})
        });
        const response = await fetch(`/api/users?${params.toString()}`, { cache: "no-store" });
        const data = await response.json();
        setEmployees(data.users || []);
      } catch (error) {
        console.error("Failed to load employees", error);
      }
    };

    loadEmployees();
  }, [employeeSearchQuery]);


  useEffect(() => {
    if (!appliedFilters) return;

    const controller = new AbortController();
    let isActive = true;

    const loadAnalytics = async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          startDate: appliedFilters.startDate,
          endDate: appliedFilters.endDate,
          page: "1",
          limit: "500", // Show all employees
          ...(tableSearchQuery ? { search: tableSearchQuery } : {})
        });

        if (appliedFilters.employeeId) params.set("employeeId", appliedFilters.employeeId);

        const [overviewResponse, productivityResponse, employeesResponse, behaviorResponse] = await Promise.all([
          fetch(`/api/admin/analytics/overview?${params.toString()}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/admin/analytics/productivity?${params.toString()}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/admin/analytics/employees?${params.toString()}`, { cache: "no-store", signal: controller.signal }),
          fetch(`/api/admin/analytics/behavior?${params.toString()}`, { cache: "no-store", signal: controller.signal })
        ]);

        const [overviewData, productivityData, employeesData, behaviorData] = await Promise.all([
          overviewResponse.json(),
          productivityResponse.json(),
          employeesResponse.json(),
          behaviorResponse.json()
        ]);

        if (!isActive) return;

        setOverview(overviewData.data || null);
        setProductivity(productivityData.data || null);
        setEmployeeTable(employeesData.data || null);
        setBehavior(behaviorData.data || null);
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          console.error("Failed to load analytics dashboard", error);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    const timeoutId = window.setTimeout(loadAnalytics, 120);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [appliedFilters, refreshTick, tableSearchQuery]);

  const selectedEmployee = employees.find((employee) => employee.id === draftEmployeeId);
  const heatmapCells = useMemo(() => {
    if (!productivity?.heatmap) return [];

    return HEATMAP_DAYS.flatMap((dayLabel, dayOfWeek) =>
      Array.from({ length: 14 }, (_, index) => {
        const hour = index + 10;
        const point = productivity.heatmap.find((item) => item.dayOfWeek === dayOfWeek && item.hour === hour);
        return {
          key: `${dayOfWeek}-${hour}`,
          dayLabel,
          hour,
          productivity: point?.productivity || 0
        };
      })
    );
  }, [productivity]);

  const showInitialSkeleton = loading && !!appliedFilters && !overview;
  const showRefreshingState = loading && !!overview;
  const hasAppliedFilters = !!appliedFilters;

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      startDate: draftStartDate,
      endDate: draftEndDate,
      employeeId: draftEmployeeId === "__all__" ? "" : draftEmployeeId
    });
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;

    const nextRange = getPresetDates(preset);
    setDraftStartDate(nextRange.startDate);
    setDraftEndDate(nextRange.endDate);
  };

  const employeeButtonLabel =
    draftEmployeeId === "__all__"
      ? "All employees"
      : selectedEmployee
        ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
        : "Select employee";

  const clearFilters = () => {
    setDatePreset("7days");
    setDraftStartDate(defaults.startDate);
    setDraftEndDate(defaults.endDate);
    setDraftEmployeeId("");
    setEmployeeSearchQuery("");
    setEmployeeDropdownOpen(false);
    setPage(1);
    setAppliedFilters(null);
    setOverview(null);
    setProductivity(null);
    setEmployeeTable(null);
    setBehavior(null);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <DashboardCard className="relative z-50 overflow-visible border-blue-500/20 bg-gradient-to-br from-sky-500/10 via-bg-secondary/70 to-emerald-500/10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Admin Productivity Intelligence</p>
              <button
                type="button"
                onClick={() => setShowExplanation((value) => !value)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/25 bg-sky-500/10 text-sky-200 transition hover:bg-sky-500/20"
                aria-label="Explain analytics"
                title="Explain analytics"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={clearFilters}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-text-secondary transition hover:bg-white/10 hover:text-text-primary"
            >
              Clear Filters
            </button>
            <button
              onClick={() => hasAppliedFilters && setRefreshTick((value) => value + 1)}
              disabled={!hasAppliedFilters}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-text-secondary"
            >
              <RefreshCcw className={`h-4 w-4 ${showRefreshingState ? "animate-spin" : ""}`} />
              {showRefreshingState ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>

        {showExplanation ? (
          <div className="mt-5 rounded-3xl border border-sky-400/15 bg-slate-950/55 p-5 text-sm text-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-sky-100">Technical Documentation: Dashboard Operations</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Data extraction, normalization, and scoring logic that powers the Admin Productivity Intelligence page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExplanation(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-slate-100"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {/* 1. Raw Data Normalization */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-sky-200 border-b border-sky-400/20 pb-2">1. Raw Data Normalization</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm">
                    <h4 className="font-semibold text-slate-100">Interaction Points Calculation</h4>
                    <p className="mt-2 text-slate-400">
                      We process 5-minute interval summaries converting physical actions into a unified metric:
                    </p>
                    <ul className="mt-2 list-inside list-disc text-slate-300 space-y-1">
                      <li>Mouse Clicks × 4</li>
                      <li>Key Presses × 2</li>
                      <li>Mouse Movements × 0.05</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02] p-4 text-sm">
                    <h4 className="font-semibold text-emerald-100">Activity Threshold (isActive)</h4>
                    <p className="mt-2 text-slate-400">
                      A record is marked as <strong className="text-emerald-300">Active</strong> if it meets at least one threshold (otherwise considered idle):
                    </p>
                    <ul className="mt-2 list-inside list-disc text-slate-300 space-y-1">
                      <li>Mouse clicks ≥ 1</li>
                      <li>Mouse movements ≥ 40</li>
                      <li>Key presses ≥ 3</li>
                      <li>Interaction points ≥ 12</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 2. Core Time Metrics */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-sky-200 border-b border-sky-400/20 pb-2">2. Core Time Metrics</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm">
                    <h4 className="font-semibold text-slate-100">Active & Idle Time</h4>
                    <p className="mt-2 text-slate-400">
                      <strong className="text-slate-200">Active Time:</strong> Total duration of Active records.<br />
                      <strong className="text-slate-200">Idle Time:</strong> Sum of inactive records. If there is an unrecorded void ≥ 120s, it&apos;s added to idle (capped at 300s max per gap).<br />
                      <strong className="text-slate-200">Tracked Time:</strong> Active + Idle.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-sky-500/10 bg-sky-500/[0.02] p-4 text-sm">
                    <h4 className="font-semibold text-sky-100">Focus Time</h4>
                    <p className="mt-2 text-slate-400">
                      Continuous active work with minimal interruptions. Must meet conditions for at least <strong className="text-sky-300">10 minutes (600s)</strong>:
                    </p>
                    <ul className="mt-2 list-inside list-disc text-slate-300 space-y-1">
                      <li>Consecutive active records (with zero chronological gaps ≥ 120s).</li>
                      <li>Low context switching: ≤ 3 applications used, with the main app driving ≥ 45% of usage.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. The Scoring Engine */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-sky-200 border-b border-sky-400/20 pb-2">3. The Scoring Engine (0-100 Scale)</h3>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <h4 className="font-semibold text-amber-200 mb-2">Primary Components</h4>
                    <p className="text-sm text-slate-300"><strong className="text-slate-100">Active Score:</strong><br />(Active Time ÷ Tracked Time) × 100</p>
                    <hr className="my-2 border-slate-700" />
                    <p className="text-sm text-slate-300"><strong className="text-slate-100">Focus Score:</strong><br />(Focus Time ÷ Active Time) × 100</p>
                    <hr className="my-2 border-slate-700" />
                    <p className="text-sm text-slate-300"><strong className="text-slate-100">Interaction Score:</strong><br />((Interaction Points ÷ Active Mins) ÷ 60) × 100</p>
                  </div>
                  <div className="lg:col-span-2 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-5 flex flex-col justify-center">
                    <h4 className="font-semibold text-sky-100 mb-2 text-lg">Final Productivity Score</h4>
                    <p className="text-slate-300 text-sm mb-4">
                      The &quot;Average Score&quot; displayed on all top cards and comparisons is a dynamically clamped, weighted composition of the metrics:
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm font-bold">
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/80">Focus<br /><span className="text-sky-300 text-xl font-black mt-1 block">50%</span></div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/80">Active<br /><span className="text-emerald-300 text-xl font-black mt-1 block">30%</span></div>
                      <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/80">Interaction<br /><span className="text-amber-300 text-xl font-black mt-1 block">20%</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Insight Visualizations */}
              <div>
                <h3 className="mb-3 text-lg font-bold text-sky-200 border-b border-sky-400/20 pb-2">4. Insight Visualizations</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <h4 className="font-semibold text-slate-100">Trends & Heatmaps</h4>
                    <p className="mt-2 text-sm text-slate-400">
                      <strong className="text-slate-200">Daily/Weekly Trends:</strong> Aggregates metrics linearly to timeline groupings.<br /><br />
                      <strong className="text-slate-200">Heatmap Density:</strong> Maps momentary 5-min productivity scores globally. Shading: &lt;40% Dark &rarr; ≥40% Amber &rarr; ≥60% Blue &rarr; ≥80% Emerald.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <h4 className="font-semibold text-amber-100">Irregular Patterns</h4>
                    <p className="mt-2 text-sm text-slate-400">
                      <strong className="text-slate-200">Context Switches:</strong> Triggered (+1) if appDiversity ≥ 4 within 5 mins.<br /><br />
                      <strong className="text-slate-200">Breaks:</strong> Triggered (+1) for inactive periods breaking deep flows.<br /><br />
                      <strong className="text-slate-200">Working Hour Rankings:</strong> Hourly buckets sorted strictly by momentary scores + interaction tie-breakers.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-400/15 bg-emerald-500/8 p-4 text-emerald-100/90 text-sm italic">
              <strong>Dashboard Architecture Note:</strong> No single click or interval explicitly judges an employee. The system aggregates cross-dimensional behaviors (focus overlap, interaction intensity, app density patterns) over sustained minimum 10 minute blocks to derive performance trends.
            </div>
          </div>
        ) : null}

        {showInitialSkeleton ? (
          <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-200/80">
              <span className="h-2 w-2 rounded-full bg-sky-300 animate-pulse" />
              Loading analytics
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300" />
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Date filter</span>
            <select
              value={datePreset}
              onChange={(event) => handlePresetChange(event.target.value as DateRangePreset)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Employee</span>
            <div className="relative z-[60]">
              <button
                type="button"
                onClick={() => setEmployeeDropdownOpen((value) => !value)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition hover:border-sky-400/40"
              >
                <span className="truncate">{employeeButtonLabel}</span>
                <Search className="h-4 w-4 text-text-secondary" />
              </button>

              {employeeDropdownOpen ? (
                <div className="absolute left-0 right-0 top-full z-[70] mt-2 rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-black/40">
                  <div className="border-b border-slate-800 p-3">
                    <div className="flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2">
                      <Search className="h-4 w-4 text-text-secondary" />
                      <input
                        value={employeeSearchQuery}
                        onChange={(event) => setEmployeeSearchQuery(event.target.value)}
                        placeholder="Search employee"
                        className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-text-secondary"
                      />
                    </div>
                  </div>
                  <div className="max-h-64 space-y-1 overflow-y-auto p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftEmployeeId("");
                        setEmployeeDropdownOpen(false);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      Select employee
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftEmployeeId("__all__");
                        setEmployeeDropdownOpen(false);
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                    >
                      All employees
                    </button>
                    {employees.map((employee) => (
                      <button
                        key={employee.id}
                        type="button"
                        onClick={() => {
                          setDraftEmployeeId(employee.id);
                          setEmployeeDropdownOpen(false);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                      >
                        {employee.firstName} {employee.lastName}
                      </button>
                    ))}
                    {!employees.length ? (
                      <div className="px-3 py-2 text-sm text-text-secondary">No employees found</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Range summary</span>
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100">
              {draftStartDate} to {draftEndDate}
            </div>
          </label>
        </div>

        {datePreset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Start date</span>
              <input type="date" value={draftStartDate} onChange={(event) => setDraftStartDate(event.target.value)} className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50" />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">End date</span>
              <input type="date" value={draftEndDate} onChange={(event) => setDraftEndDate(event.target.value)} className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/50" />
            </label>
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[auto_auto_1fr]">
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
            >
              Apply Filters
            </button>
          </div>

        </div>
      </DashboardCard>

      {showInitialSkeleton ? (
        <AnalyticsDashboardSkeleton />
      ) : null}

      {overview ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard label="Total Employees" value={overview.totalEmployees} subtext={overview.dateRangeLabel} icon={<Users className="h-6 w-6" />} color="blue" />
            <StatsCard label="Active Today" value={overview.activeEmployeesToday} subtext="currently productive" icon={<Activity className="h-6 w-6" />} color="green" />
            <StatsCard label="Average Score" value={`${overview.averageProductivityScore}%`} subtext="weighted productivity" icon={<TrendingUp className="h-6 w-6" />} color="yellow" />
            <StatsCard label="Total Active Time" value={formatSecondsToHours(overview.totalActiveTimeSeconds)} subtext={`Focus ${formatSecondsToHours(overview.totalFocusTimeSeconds)}`} icon={<Clock3 className="h-6 w-6" />} color="orange" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DashboardCard>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Daily productivity trend</h2>
                  <p className="text-sm text-text-secondary">Average score, active hours, and focus hours by day</p>
                </div>
                <CalendarRange className="h-5 w-5 text-sky-300" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productivity?.daily || []}>
                    <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgb(var(--text-secondary))" fontSize={12} />
                    <YAxis yAxisId="left" stroke="rgb(var(--text-secondary))" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="rgb(var(--text-secondary))" fontSize={12} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3", stroke: "rgba(56,189,248,0.5)" }}
                      contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 16, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.4)" }}
                      itemStyle={{ color: "rgb(var(--text-primary))", fontSize: 12, fontWeight: 600 }}
                      labelStyle={{ color: "rgb(var(--text-secondary))", marginBottom: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="productivityScore" name="Productivity" stroke="#38bdf8" strokeWidth={3} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="activeTimeHours" name="Active Hours" stroke="#34d399" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="focusTimeHours" name="Focus Hours" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Weekly productivity trend</h2>
                  <p className="text-sm text-text-secondary">Weekly averages across the filtered organization scope</p>
                </div>
                <Flame className="h-5 w-5 text-amber-300" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productivity?.weekly || []}>
                    <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                    <XAxis dataKey="week" stroke="rgb(var(--text-secondary))" fontSize={12} />
                    <YAxis stroke="rgb(var(--text-secondary))" fontSize={12} />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.08)", radius: 8 }}
                      contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 16, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.4)" }}
                      itemStyle={{ color: "rgb(var(--text-primary))", fontSize: 12, fontWeight: 600 }}
                      labelStyle={{ color: "rgb(var(--text-secondary))", marginBottom: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}
                    />
                    <Legend />
                    <Bar dataKey="productivityScore" name="Productivity" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="interactionScore" name="Interaction" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardCard>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Employee comparison</h2>
                  <p className="text-sm text-text-secondary">Top productivity performers in the selected date range</p>
                </div>
                <Users className="h-5 w-5 text-sky-300" />
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    layout="vertical" 
                    data={productivity?.employeeComparison || []} 
                    margin={{ left: 30, right: 40, top: 10, bottom: 10 }}
                    barGap={8}
                    barSize={12}
                  >
                    <CartesianGrid stroke="rgba(148,163,184,0.1)" horizontal={false} />
                    <XAxis 
                      type="number" 
                      domain={[0, 100]}
                      stroke="rgb(var(--text-secondary))" 
                      fontSize={11}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={140} 
                      stroke="rgb(var(--text-primary))" 
                      fontSize={11}
                      fontWeight={600}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148, 163, 184, 0.08)", radius: 8 }}
                      contentStyle={{ backgroundColor: "rgba(15,23,42,0.95)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 16, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.4)" }}
                      itemStyle={{ color: "rgb(var(--text-primary))", fontSize: 12, fontWeight: 600 }}
                      labelStyle={{ color: "rgb(var(--text-secondary))", marginBottom: 4, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}
                    />
                    <Legend iconType="circle" />
                    <Bar 
                      dataKey="productivityScore" 
                      name="Productivity" 
                      fill="#34d399" 
                      radius={[0, 4, 4, 0]} 
                      background={{ fill: 'rgba(var(--text-secondary), 0.03)', radius: 4 }}
                    />
                    <Bar 
                      dataKey="interactionScore" 
                      name="Interaction" 
                      fill="#38bdf8" 
                      radius={[0, 4, 4, 0]} 
                      background={{ fill: 'rgba(var(--text-secondary), 0.03)', radius: 4 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Behavior insights</h2>
                <p className="text-sm text-text-secondary">Best hours, low productivity windows, and pattern warnings</p>
              </div>
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-100">
                    <TrendingUp className="h-4 w-4" />
                    Best working hours
                  </div>
                  <div className="space-y-2">
                    {(behavior?.bestWorkingHours || []).map((slot) => (
                      <div key={slot.label} className="flex items-center justify-between text-emerald-50/90">
                        <span>{slot.label}</span>
                        <span>{slot.productivity}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-rose-100">
                    <TrendingDown className="h-4 w-4" />
                    Low productivity hours
                  </div>
                  <div className="space-y-2">
                    {(behavior?.lowProductivityHours || []).map((slot) => (
                      <div key={slot.label} className="flex items-center justify-between text-rose-50/90">
                        <span>{slot.label}</span>
                        <span>{slot.productivity}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4 text-sky-50/90">
                  <div className="font-semibold">Peak activity time</div>
                  <div className="mt-2 text-lg font-bold">{behavior?.peakActivityTime ? behavior.peakActivityTime.label : "No activity"}</div>
                  <div className="text-sm text-sky-100/80">
                    {behavior?.peakActivityTime ? `${behavior.peakActivityTime.activeTimeHours} active hours captured` : "No active intervals in the current range"}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <DashboardCard allowOverflow={true}>
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Employee productivity table</h2>
                  <p className="text-sm text-text-secondary">Calculated from active time, focus continuity, and interaction score</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={tableSearchQuery}
                      onChange={(e) => setTableSearchQuery(e.target.value)}
                      className="h-9 w-64 rounded-xl border border-border-color bg-bg-secondary pl-9 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
                    />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{employeeTable?.pagination.total || 0} employees</span>
                </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto overflow-x-auto pr-2 custom-scrollbar">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-color text-left text-text-secondary">
                      <th className="px-3 py-3 font-medium">Employee</th>
                      <th className="px-3 py-3 font-medium">Department</th>
                      <th className="px-3 py-3 font-medium">Active time</th>
                      <th className="px-3 py-3 font-medium">Focus time</th>
                      <th className="px-3 py-3 font-medium">Score</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employeeTable?.rows || []).map((row) => (
                      <tr key={row.employeeId} className="border-b border-border-color/50 text-text-primary">
                        <td className="px-3 py-3">
                          <div className="font-semibold">{row.name}</div>
                          <div className="text-xs text-text-secondary">Best hour {row.bestWorkingHour}</div>
                        </td>
                        <td className="px-3 py-3 text-text-secondary">{row.department}</td>
                        <td className="px-3 py-3">{row.activeTime}</td>
                        <td className="px-3 py-3">{row.focusTime}</td>
                        <td className="px-3 py-3">
                          <div className="font-semibold">{row.productivityScore}%</div>
                          <div className="text-xs text-text-secondary">Interaction {row.interactionScore}%</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.status === "Active" ? "bg-emerald-500/15 text-emerald-300" : row.status === "Needs Attention" ? "bg-amber-500/15 text-amber-300" : "bg-slate-500/15 text-slate-300"}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Irregular work patterns</h2>
                <p className="text-sm text-text-secondary">Frequent breaks, context switching, and off-pattern work windows</p>
              </div>
              <div className="space-y-3">
                {(behavior?.irregularWorkingPatterns || []).map((item) => (
                  <div key={item.employeeId} className="rounded-xl border border-border-color bg-black/10 p-4">
                    <div className="font-semibold text-text-primary">{item.name}</div>
                    <div className="text-xs uppercase tracking-wider text-text-secondary">{item.department}</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-secondary">
                      <div><div className="text-text-primary">{item.irregularActivityCount}</div><div>Irregular spikes</div></div>
                      <div><div className="text-text-primary">{item.frequentBreaks}</div><div>Breaks</div></div>
                      <div><div className="text-text-primary">{item.contextSwitches}</div><div>Switches</div></div>
                    </div>
                  </div>
                ))}
                {!behavior?.irregularWorkingPatterns?.length ? (
                  <div className="rounded-xl border border-border-color bg-black/10 p-4 text-sm text-text-secondary">No irregular patterns detected in the current range.</div>
                ) : null}
              </div>
            </DashboardCard>
          </div>

          <DashboardCard allowOverflow={true}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-text-primary">Working-hour heatmap</h2>
                  <div className="group relative">
                    <Info className="h-4 w-4 cursor-help text-text-secondary transition-colors hover:text-accent" />
                    <div className="absolute bottom-full left-0 mb-3 hidden w-48 rounded-2xl border border-border-color bg-bg-primary p-4 shadow-2xl group-hover:block animate-in fade-in zoom-in duration-200 z-[100]">
                      <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-text-secondary border-b border-border-color pb-2">Productivity Scale</p>
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-emerald-500/80 ring-2 ring-emerald-500/20" />
                          <span className="text-xs font-semibold text-text-primary">80-100 <span className="text-[10px] text-text-secondary font-medium ml-1">(Efficient)</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-sky-500/75 ring-2 ring-sky-500/20" />
                          <span className="text-xs font-semibold text-text-primary">60-80 <span className="text-[10px] text-text-secondary font-medium ml-1">(Active)</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-amber-500/70 ring-2 ring-amber-500/20" />
                          <span className="text-xs font-semibold text-text-primary">40-60 <span className="text-[10px] text-text-secondary font-medium ml-1">(Steady)</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-rose-500/70 ring-2 ring-rose-500/20" />
                          <span className="text-xs font-semibold text-text-primary">1-40 <span className="text-[10px] text-text-secondary font-medium ml-1">(Low)</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-slate-800/40 border border-white/5" />
                          <span className="text-xs font-semibold text-text-primary">0 <span className="text-[10px] text-text-secondary font-medium ml-1">(No Activity)</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-text-secondary">Hourly productivity density across the week</p>
              </div>
              <div className="text-xs uppercase tracking-wider text-text-secondary">0-100 score scale</div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid min-w-[620px] grid-cols-[80px_repeat(14,minmax(28px,1fr))] gap-2 text-xs">
                <div />
                {Array.from({ length: 14 }, (_, index) => (
                  <div key={index} className="text-center text-text-secondary">{index + 10}</div>
                ))}
                {HEATMAP_DAYS.map((dayLabel) => (
                  <div key={`${dayLabel}-label`} className="contents">
                    <div className="flex items-center text-text-secondary">{dayLabel}</div>
                    {heatmapCells.filter((cell) => cell.dayLabel === dayLabel).map((cell) => (
                      <div key={cell.key} title={`${cell.dayLabel} ${cell.hour}:00 - ${cell.productivity}% productivity`} className={`h-9 rounded-lg border border-white/5 ${heatColor(cell.productivity)}`} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </DashboardCard>
        </>
      ) : !loading && !hasAppliedFilters ? (
        <DashboardCard className="border-sky-500/20 bg-gradient-to-br from-sky-500/10 via-bg-secondary/70 to-transparent">
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10">
              <Search className="h-6 w-6 text-sky-300" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Choose filters to load analytics</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Select a date range and employee scope, then click <span className="font-semibold text-emerald-300">Apply Filters</span>.
            </p>
          </div>
        </DashboardCard>
      ) : !loading ? (
        <DashboardCard>
          <div className="py-12 text-center text-text-secondary">No monitor data matched the selected filters.</div>
        </DashboardCard>
      ) : null}
    </div>
  );
}
