"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type LeaveType = { _id: string; name: string; code?: string };

export default function ApplyLeaveModal({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied?: () => void }) {
  const [types, setTypes] = useState<LeaveType[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ leaveTypeName: "", startDate: "", endDate: "", duration: "full-day", reason: "" });
  const [attachment, setAttachment] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/leave-types")
      .then((r) => r.json())
      .then((d) => setTypes(d.data || []))
      .catch((e) => setTypes([]));
  }, []);

  if (!open) return null;

  const submit = async () => {
    setLoading(true);
    try {
      // Resolve typed leave type name to an id if possible
      const name = form.leaveTypeName?.trim();
      if (!name) {
        const msg = "Please enter a leave type";
        toast.error(msg);
        setLoading(false);
        return;
      }

      let leaveTypeId: string | null = null;
      if (types && types.length > 0) {
        const found = types.find((t) => t.name.toLowerCase() === name.toLowerCase() || (t.code && t.code.toLowerCase() === name.toLowerCase()));
        if (found) leaveTypeId = found._id;
      }

      // If leaveTypeId is null we will send the typed name to the backend which
      // will resolve or create the LeaveType. This allows free-text input.
      const inputToSend = leaveTypeId ?? name;

      const fd = new FormData();
      fd.append("leaveType", inputToSend);
      fd.append("startDate", form.startDate);
      fd.append("endDate", form.endDate);
      fd.append("duration", form.duration);
      fd.append("reason", form.reason);
      if (attachment) fd.append("attachments", attachment);

      const res = await fetch("/api/leaves/apply", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        toast.success("Leave application submitted successfully!");
        onApplied?.();
        onClose();
      } else {
        const errorMsg = json.error || "Failed to apply leave";
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : "Failed to apply leave";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[520px] rounded-lg bg-slate-950 p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Apply for Leave</h3>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Leave Type</label>
            <input
              list="leave-types"
              className="w-full rounded bg-slate-900/50 p-2"
              value={form.leaveTypeName}
              onChange={(e) => setForm((s) => ({ ...s, leaveTypeName: e.target.value }))}
              placeholder="Start typing to select a leave type"
            />
            <datalist id="leave-types">
              {(types || []).map((t) => (
                <option key={t._id} value={t.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Start Date</label>
              <input type="date" className="w-full rounded bg-slate-900/50 p-2" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">End Date</label>
              <input type="date" className="w-full rounded bg-slate-900/50 p-2" value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Duration</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setForm((s) => ({ ...s, duration: 'full-day' }))} className={`rounded px-3 py-1 ${form.duration === 'full-day' ? 'bg-accent text-slate-900' : 'bg-slate-800'}`}>Full Day</button>
              <button type="button" onClick={() => setForm((s) => ({ ...s, duration: 'half-first' }))} className={`rounded px-3 py-1 ${form.duration === 'half-first' ? 'bg-accent text-slate-900' : 'bg-slate-800'}`}>First Half</button>
              <button type="button" onClick={() => setForm((s) => ({ ...s, duration: 'half-second' }))} className={`rounded px-3 py-1 ${form.duration === 'half-second' ? 'bg-accent text-slate-900' : 'bg-slate-800'}`}>Second Half</button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Reason</label>
            <textarea className="w-full rounded bg-slate-900/50 p-2" rows={3} value={form.reason} onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Attachment (optional)</label>
            <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] ?? null)} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded bg-slate-800 px-4 py-2">Cancel</button>
          <button onClick={submit} disabled={loading} className="rounded bg-accent px-4 py-2 font-semibold text-slate-900">{loading ? 'Applying...' : 'Apply Leave'}</button>
        </div>
      </div>
    </div>
  );
}
