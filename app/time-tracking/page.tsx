 "use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import TrackedHours from "@/components/time-tracking/TrackedHours";

type ActiveSession = {
  id: string;
  clockIn: string;
  note?: string;
};

type TodaySession = {
  id: string;
  clockIn: string;
  clockOut?: string | null;
  durationMinutes?: number;
};

type ProjectOption = {
  id: string;
  name: string;
};

type Allocation = {
  projectId: string;
  hours: number;
  notes?: string;
};

export default function TimeTrackingPage() {
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [clockOutNote, setClockOutNote] = useState("");
  const [allocError, setAllocError] = useState<string | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  async function loadActive() {
    setError(null);
    try {
      const res = await fetch("/api/time-entries/active");
      if (res.status === 401) {
        setActive(null);
        return;
      }
      if (!res.ok) {
        throw new Error("Unable to load current session");
      }
      const data = (await res.json()) as { active: ActiveSession | null };
      setActive(data.active);
    } catch (e) {
      console.error(e);
      setError("Could not load current session.");
    }
  }

  async function loadTodaySessions() {
    try {
      const res = await fetch("/api/time-entries/today");
      if (!res.ok) return;
      const data = (await res.json()) as { sessions: TodaySession[] };
      setTodaySessions(data.sessions);
    } catch {
      // ignore
    }
  }

  async function loadProjectsForUser() {
    try {
      const res = await fetch("/api/projects?forCurrentUser=true");
      if (!res.ok) return;
      const data = (await res.json()) as {
        id: string;
        name: string;
      }[];
      setProjects(data.map((p) => ({ id: p.id, name: p.name })));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadActive(), loadTodaySessions()]).finally(() =>
      setLoading(false)
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleClockIn() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/time-entries/clock-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ note: note || undefined })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to clock in");
      }
      const data = (await res.json()) as ActiveSession;
      setActive(data);
      setNote("");
      await loadTodaySessions();
      toast.success("Clocked in successfully!");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to clock in.";
      console.error(e);
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  function openClockOutModal() {
    setAllocations([]);
    setClockOutNote("");
    setAllocError(null);
    setShowClockOutModal(true);
    void loadProjectsForUser();
  }

  async function submitClockOut() {
    if (!active) return;
    setBusy(true);
    setAllocError(null);
    setError(null);

    const clockInDate = new Date(active.clockIn);
    const diffMs = Date.now() - clockInDate.getTime();
    const totalMinutes = Math.max(Math.round(diffMs / 60000), 0);
    const totalAllocatedMinutes = allocations.reduce(
      (sum, a) => sum + a.hours * 60,
      0
    );
    if (totalAllocatedMinutes > totalMinutes) {
      setBusy(false);
      const msg = "Project hours cannot exceed total worked time.";
      setAllocError(msg);
      toast.error(msg);
      return;
    }

    try {
      const res = await fetch("/api/time-entries/clock-out", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          allocations,
          note: clockOutNote || undefined
        })
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error || "Failed to clock out");
      }
      setActive(null);
      setShowClockOutModal(false);
      await loadTodaySessions();
      
      // Show success message with project details
      const projectCount = allocations.filter(a => a.hours > 0).length;
      if (projectCount > 0) {
        const projectNames = allocations
          .filter(a => a.hours > 0)
          .map(a => {
            const project = projects.find(p => p.id === a.projectId);
            return `${project?.name} (${a.hours}h)`;
          })
          .join(", ");
        toast.success(`Clocked out! Allocated: ${projectNames}`);
      } else {
        toast.success("Clocked out successfully!");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to clock out.";
      console.error(e);
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  const isClockedIn = !!active;
  const clockInTime = active
    ? new Date(active.clockIn).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  const todayLabel = now ? now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  }) : "Loading...";

  const currentTimeLabel = now ? now.toLocaleTimeString(undefined, {
    hour12: false
  }) : "--:--:--";

  const todayShortHistory = useMemo(
    () => todaySessions.slice(-3),
    [todaySessions]
  );

  return (
    <div className="space-y-5 p-6">
      <h1 className="text-sm font-semibold text-slate-50">Time Clock</h1>
      <p className="text-xs text-slate-400">
        Log your hours and manage your productivity.
      </p>

      <section className="grid gap-5 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-slate-50 shadow-card">
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-100/80">
              {todayLabel}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight">
              {currentTimeLabel}
            </p>
            <p className="mt-2 inline-flex items-center rounded-full bg-indigo-800/80 px-3 py-1 text-[11px] font-medium text-indigo-100">
              {isClockedIn ? "Clocked In" : "Not Clocked In"}
            </p>

            {error && (
              <p className="mt-3 rounded-md bg-rose-900/70 px-3 py-2 text-[11px] text-rose-100">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={busy || loading}
                onClick={
                  isClockedIn
                    ? () => openClockOutModal()
                    : () => void handleClockIn()
                }
                className={`flex w-full max-w-xs items-center justify-center rounded-full px-6 py-2.5 text-[12px] font-semibold text-slate-50 shadow-lg shadow-indigo-900/60 ${
                  isClockedIn
                    ? "bg-rose-500 hover:bg-rose-400"
                    : "bg-indigo-500 hover:bg-indigo-400"
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {busy
                  ? isClockedIn
                    ? "Clocking out..."
                    : "Clocking in..."
                  : isClockedIn
                  ? "Clock out"
                  : "Clock in"}
              </button>

              <p className="text-[11px] text-indigo-100/80">
                {isClockedIn
                  ? `Clocked in at ${clockInTime}`
                  : "Starts 09:00 AM · No Overtime"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-card/80 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-100">
                  Today&apos;s History
                </p>
                <p className="text-[11px] text-slate-500">
                  Recent sessions for today.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="text-[11px] font-medium text-accent hover:underline"
              >
                View All
              </button>
            </div>

            <div className="mt-4 space-y-2 text-[11px] text-slate-300">
              {todayShortHistory.length === 0 && (
                <p className="text-slate-500">No sessions yet today.</p>
              )}
              {todayShortHistory.map((s) => {
                const start = new Date(s.clockIn).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const end = s.clockOut
                  ? new Date(s.clockOut).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "—";
                const duration =
                  s.durationMinutes != null
                    ? `${Math.floor(s.durationMinutes / 60)
                        .toString()
                        .padStart(2, "0")}:${(s.durationMinutes % 60)
                        .toString()
                        .padStart(2, "0")}`
                    : "--:--";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-100">
                        {start} – {end}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Session
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <TrackedHours />

      {showClockOutModal && active && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-50">
                  Allocate today&apos;s hours
                </p>
                <p className="text-[11px] text-slate-500">
                  Select projects and enter hours worked before clocking out.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowClockOutModal(false)}
                className="rounded-full px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            {allocError && (
              <p className="mt-3 rounded-md border border-rose-700 bg-rose-950/60 px-3 py-2 text-[11px] text-rose-100">
                {allocError}
              </p>
            )}

            <div className="mt-3 max-h-52 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80">
              {projects.length === 0 && (
                <p className="px-3 py-3 text-[11px] text-slate-500">
                  No projects assigned. You can still clock out without
                  allocations.
                </p>
              )}
              {projects.map((p) => {
                const current = allocations.find((a) => a.projectId === p.id);
                return (
                  <div
                    key={p.id}
                    className="space-y-2 border-b border-slate-800/70 px-3 py-3 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-[11px] text-slate-100">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-accent"
                          checked={!!current}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllocations((prev) => [
                                ...prev,
                                { projectId: p.id, hours: 0, notes: "" }
                              ]);
                            } else {
                              setAllocations((prev) =>
                                prev.filter((a) => a.projectId !== p.id)
                              );
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                      {current && (
                        <input
                          type="number"
                          min={0}
                          step={0.25}
                          value={current.hours}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value || "0");
                            setAllocations((prev) =>
                              prev.map((a) =>
                                a.projectId === p.id
                                  ? { ...a, hours: isNaN(value) ? 0 : value }
                                  : a
                              )
                            );
                          }}
                          className="h-8 w-16 rounded-md border border-slate-700 bg-slate-900/70 px-2 text-right text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                          placeholder="0.0"
                        />
                      )}
                    </div>
                    {current && (
                      <input
                        type="text"
                        value={current.notes || ""}
                        onChange={(e) => {
                          setAllocations((prev) =>
                            prev.map((a) =>
                              a.projectId === p.id
                                ? { ...a, notes: e.target.value }
                                : a
                            )
                          );
                        }}
                        placeholder="Notes for this project..."
                        className="w-full rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-[11px] text-slate-300">
                Notes (optional)
              </label>
              <textarea
                rows={3}
                value={clockOutNote}
                onChange={(e) => setClockOutNote(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
                placeholder="Anything important about this shift?"
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClockOutModal(false)}
                className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitClockOut()}
                className="rounded-md bg-rose-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-md shadow-rose-500/40 hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy ? "Saving..." : "Save & clock out"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-50">
                Today&apos;s sessions
              </p>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="rounded-full px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto text-[11px] text-slate-300">
              {todaySessions.length === 0 && (
                <p className="text-slate-500">No sessions today.</p>
              )}
              {todaySessions.map((s) => {
                const start = new Date(s.clockIn).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                });
                const end = s.clockOut
                  ? new Date(s.clockOut).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "—";
                const duration =
                  s.durationMinutes != null
                    ? `${Math.floor(s.durationMinutes / 60)
                        .toString()
                        .padStart(2, "0")}:${(s.durationMinutes % 60)
                        .toString()
                        .padStart(2, "0")}`
                    : "--:--";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md bg-slate-900/60 px-3 py-2"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-100">
                        {start} – {end}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Session
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {duration}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

