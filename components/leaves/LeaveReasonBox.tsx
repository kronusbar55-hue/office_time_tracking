"use client";

import { useState } from "react";

export default function LeaveReasonBox({ reason }: { reason?: string }) {
  const [open, setOpen] = useState(false);
  if (!reason) return <div className="text-sm text-text-secondary">No reason provided</div>;

  const short = reason.length > 200 ? reason.slice(0, 200) + "…" : reason;

  return (
    <div className="rounded-lg bg-emerald-500/5 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
        Reason
      </div>
      <div className="mt-2 text-sm leading-relaxed text-text-secondary">
        {reason.length > 200 && !open ? short : reason}
        {reason.length > 200 && (
          <button
            onClick={() => setOpen(!open)}
            className="ml-2 text-xs text-emerald-400 underline hover:text-emerald-300"
            aria-expanded={open}
          >
            {open ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}
