import React, { useState } from 'react';

export default function LeaveReasonBox({ reason }: { reason?: string }) {
  const [open, setOpen] = useState(false);
  if (!reason) return <div className="text-sm text-slate-400">No reason provided</div>;

  const short = reason.length > 200 ? reason.slice(0, 200) + '…' : reason;

  return (
    <div className="bg-slate-900/50 p-3 rounded text-sm leading-6" style={{ lineHeight: 1.6 }}>
      <div className="font-medium text-sm text-slate-200">Reason</div>
      <div className="mt-2 text-slate-300">
        {reason.length > 200 && !open ? short : reason}
        {reason.length > 200 && (
          <button onClick={() => setOpen(!open)} className="ml-2 text-xs text-accent underline" aria-expanded={open}>
            {open ? 'Show less' : 'Read more'}
          </button>
        )}
      </div>
    </div>
  );
}
