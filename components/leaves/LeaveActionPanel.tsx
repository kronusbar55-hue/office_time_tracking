import React from 'react';

export default function LeaveActionPanel({ leave, role, onDone }: { leave: any; role?: string | null; onDone?: () => void }) {
  const handleApprove = async () => {
    try {
      const res = await fetch('/api/leaves/approve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: leave._id }) });
      if (res.ok && onDone) onDone();
      else {
        const j = await res.json();
        alert(j.error || 'Failed to approve');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to approve');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason (optional)') || '';
    try {
      const res = await fetch('/api/leaves/reject', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: leave._id, managerComment: reason }) });
      if (res.ok && onDone) onDone();
      else {
        const j = await res.json();
        alert(j.error || 'Failed to reject');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to reject');
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/leaves/cancel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: leave._id }) });
      if (res.ok && onDone) onDone();
      else {
        const j = await res.json();
        alert(j.error || 'Failed to cancel');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to cancel');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {role === 'admin' && leave.status === 'pending' && (
        <>
          <button onClick={handleApprove} className="rounded bg-emerald-600/20 px-3 py-1 text-xs text-emerald-300">Approve</button>
          <button onClick={handleReject} className="rounded bg-rose-600/10 px-3 py-1 text-xs text-rose-300">Reject</button>
        </>
      )}
      {role === 'employee' && leave.status === 'pending' && (
        <button onClick={handleCancel} className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-200">Cancel Request</button>
      )}
    </div>
  );
}
