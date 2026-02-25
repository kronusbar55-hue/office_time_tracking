"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useTimeTracking } from "./TimeTrackingProvider";

type AssignedProject = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  workedMsSnapshot: number;
  breakMsSnapshot: number;
  onCompleted?: () => void;
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function CheckoutModal({
  open,
  onClose,
  workedMsSnapshot,
  breakMsSnapshot,
  onCompleted
}: Props) {
  const { refresh } = useTimeTracking();
  const [projects, setProjects] = useState<AssignedProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generalNotes, setGeneralNotes] = useState("");

  type ProjectRow = {
    id: string;
    projectId: string;
    description: string;
    hours: string;
    minutes: string;
  };

  const [rows, setRows] = useState<ProjectRow[]>([]);

  const workedMinutes = Math.max(0, Math.round(workedMsSnapshot / 60000));
  const breakMinutes = Math.max(0, Math.round(breakMsSnapshot / 60000));

  const saveDraft = (draftRows: ProjectRow[], notes: string) => {
    try {
      if (typeof window === "undefined") return;
      const payload = {
        rows: draftRows,
        generalNotes: notes
      };
      window.localStorage.setItem(
        "checkout_project_logs_draft",
        JSON.stringify(payload)
      );
    } catch {
      // ignore draft errors
    }
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSubmitting(false);
    setGeneralNotes("");

    let initialRows: ProjectRow[] = [
      {
        id: "row-1",
        projectId: "",
        description: "",
        hours: "",
        minutes: ""
      }
    ];

    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem("checkout_project_logs_draft");
        if (raw) {
          const parsed = JSON.parse(raw) as {
            rows?: ProjectRow[];
            generalNotes?: string;
          } | null;
          if (parsed?.rows && parsed.rows.length > 0) {
            initialRows = parsed.rows;
          }
          if (typeof parsed?.generalNotes === "string") {
            setGeneralNotes(parsed.generalNotes);
          }
        }
      }
    } catch {
      // ignore bad drafts
    }

    setRows(initialRows);

    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await fetch("/api/projects/assigned-to-me", {
          cache: "no-store"
        });
        if (!res.ok) {
          throw new Error("Failed to load projects");
        }
        const data = await res.json();
        const list: AssignedProject[] = (data || []).map((p: any) => ({
          id: p._id || p.id,
          name: p.projectName || p.name
        }));
        setProjects(list);
      } catch (e) {
        console.error(e);
        setError("Could not load assigned projects");
      } finally {
        setLoadingProjects(false);
      }
    };

    void loadProjects();
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validRows = rows.filter(
      (r) =>
        r.projectId &&
        r.description.trim().length >= 10 &&
        (parseInt(r.hours || "0", 10) > 0 || parseInt(r.minutes || "0", 10) > 0)
    );

    if (validRows.length === 0) {
      setError("Log at least one project with description and time.");
      return;
    }

    const projectLogs = validRows.map((r) => {
      const h = parseInt(r.hours || "0", 10);
      const m = parseInt(r.minutes || "0", 10);
      const minutes = h * 60 + m;
      return {
        projectId: r.projectId,
        description: r.description.trim(),
        workedMinutes: minutes
      };
    });

    const totalWorkedMinutes = workedMinutes;
    const totalBreakMinutes = breakMinutes;

    try {
      setSubmitting(true);
      const res = await fetch("/api/attendance/checkout-with-project-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          totalWorkedMinutes,
          totalBreakMinutes,
          projectLogs,
          generalNotes: generalNotes || null
        })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to checkout");
      }

      await refresh();
      onClose();
      onCompleted?.();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to checkout and save work log"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasProjects = projects.length > 0;

  const updateRows = (updater: (current: typeof rows) => typeof rows) => {
    setRows((prev) => {
      const next = updater(prev);
      saveDraft(next, generalNotes);
      return next;
    });
  };

  const addRow = () => {
    updateRows((prev) => [
      ...prev,
      {
        id: `row-${prev.length + 1}-${Date.now()}`,
        projectId: "",
        description: "",
        hours: "",
        minutes: ""
      }
    ]);
  };

  const removeRow = (id: string) => {
    updateRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleGeneralNotesChange = (value: string) => {
    setGeneralNotes(value);
    saveDraft(rows, value);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Clock Out & Log Today&apos;s Work
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Your worked hours are auto-calculated. Distribute them across projects,
              add descriptions, and include any general notes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            disabled={submitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1 — Project Work Logs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Project Work Logs
              </h3>
              <button
                type="button"
                onClick={addRow}
                disabled={submitting || loadingProjects || !hasProjects}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/70 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                Add Another Project
              </button>
            </div>

            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Project
                    </label>
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    value={row.projectId}
                    onChange={(e) =>
                      updateRows((prev) =>
                        prev.map((r) =>
                          r.id === row.id ? { ...r, projectId: e.target.value } : r
                        )
                      )
                    }
                    disabled={loadingProjects || submitting}
                  >
                    <option value="">
                      {loadingProjects
                        ? "Loading projects..."
                        : hasProjects
                        ? "Select project worked on today"
                        : "No assigned projects"}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Work Description
                    </label>
                    <textarea
                      className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="Describe what you worked on for this project…"
                      value={row.description}
                      onChange={(e) =>
                        updateRows((prev) =>
                          prev.map((r) =>
                            r.id === row.id ? { ...r, description: e.target.value } : r
                          )
                        )
                      }
                      disabled={submitting}
                    />
                    <p className="text-[10px] text-slate-500">
                      Minimum 10 characters. Include key tasks and outcomes.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Worked Hours (HH:MM)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                        value={row.hours}
                        onChange={(e) =>
                          updateRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, hours: e.target.value } : r
                            )
                          )
                        }
                        disabled={submitting}
                      />
                      <span className="text-xs text-slate-400">:</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                        value={row.minutes}
                        onChange={(e) =>
                          updateRows((prev) =>
                            prev.map((r) =>
                              r.id === row.id ? { ...r, minutes: e.target.value } : r
                            )
                          )
                        }
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2 — General Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              General Work Notes (optional)
            </label>
            <textarea
              className="min-h-[72px] w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Meetings, research, learning, internal discussions…"
              value={generalNotes}
              onChange={(e) => handleGeneralNotesChange(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* Section 3 — Auto Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total Worked Hours
              </p>
              <p className="mt-1 text-lg font-mono font-semibold text-emerald-400">
                {formatDuration(workedMsSnapshot)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total Break Time
              </p>
              <p className="mt-1 text-lg font-mono font-semibold text-slate-200">
                {formatDuration(breakMsSnapshot)}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              You must submit today&apos;s work summary before completing clock out.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Submit & Clock Out"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

