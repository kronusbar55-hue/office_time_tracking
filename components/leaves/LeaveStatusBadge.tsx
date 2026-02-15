"use client";

export default function LeaveStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    approved: { bg: "bg-emerald-500/20 border-emerald-500/50", text: "text-emerald-400" },
    pending: { bg: "bg-amber-500/20 border-amber-500/50", text: "text-amber-400" },
    rejected: { bg: "bg-rose-500/20 border-rose-500/50", text: "text-rose-400" },
    cancelled: { bg: "bg-slate-500/20 border-slate-500/50", text: "text-slate-400" },
  };

  const label = status?.toString() || "pending";
  const styles = map[label] || map.pending;

  return (
    <span
      role="status"
      aria-label={`Leave status: ${label}`}
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${styles.bg} ${styles.text}`}
    >
      {label}
    </span>
  );
}
