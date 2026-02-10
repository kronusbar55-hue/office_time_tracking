import React from 'react';

export default function LeaveStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-600/10 text-amber-300',
    approved: 'bg-emerald-600/20 text-emerald-300',
    rejected: 'bg-rose-600/10 text-rose-300',
    cancelled: 'bg-slate-600/10 text-slate-300'
  };

  const label = status?.toString() || 'pending';

  return (
    <span
      role="status"
      aria-label={`Leave status: ${label}`}
      title={`Status: ${label}`}
      className={`rounded-full px-3 py-1 text-xs font-medium ${map[label] || map.pending}`}
    >
      {label}
    </span>
  );
}
