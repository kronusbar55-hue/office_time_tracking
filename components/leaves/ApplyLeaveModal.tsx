"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { Search, X } from "lucide-react";

type LeaveType = { _id: string; name: string; code?: string };
type UserOption = { id: string; firstName: string; lastName: string; email: string; role?: string };

export default function ApplyLeaveModal({
  open,
  onClose,
  onApplied,
}: {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const [types, setTypes] = useState<LeaveType[] | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    leaveTypeName: "",
    startDate: "",
    endDate: "",
    duration: "full-day" as "full-day" | "half-first" | "half-second",
    reason: "",
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [selectedCC, setSelectedCC] = useState<UserOption[]>([]);
  const [ccSearch, setCcSearch] = useState("");
  const [ccDropdownOpen, setCcDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      fetch("/api/leave-types")
        .then((r) => r.json())
        .then((d) => setTypes(d.data || []))
        .catch(() => setTypes([]));

      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : data.data || data.users || [];
          setUsers(
            list.map((u: any) => ({
              id: u.id || u._id,
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              email: u.email || "",
              role: u.role,
            }))
          );
        })
        .catch(() => setUsers([]));
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCcDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      !selectedCC.some((s) => s.id === u.id) &&
      (ccSearch === "" ||
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(ccSearch.toLowerCase()))
  );

  const addCC = (u: UserOption) => {
    if (!selectedCC.some((s) => s.id === u.id)) {
      setSelectedCC((prev) => [...prev, u]);
      setCcSearch("");
      setCcDropdownOpen(false);
    }
  };

  const removeCC = (id: string) => {
    setSelectedCC((prev) => prev.filter((u) => u.id !== id));
  };

  if (!open) return null;

  const today = new Date().toISOString().split("T")[0];

  const submit = async () => {
    setLoading(true);
    try {
      const name = form.leaveTypeName?.trim();
      if (!name) {
        toast.error("Please enter a leave type");
        setLoading(false);
        return;
      }
      if (!form.startDate || !form.endDate || !form.reason) {
        toast.error("Please fill in all required fields");
        setLoading(false);
        return;
      }

      let leaveTypeId: string | null = null;
      if (types && types.length > 0) {
        const found = types.find(
          (t) =>
            t.name.toLowerCase() === name.toLowerCase() ||
            (t.code && t.code.toLowerCase() === name.toLowerCase())
        );
        if (found) leaveTypeId = found._id;
      }
      const inputToSend = leaveTypeId ?? name;

      const fd = new FormData();
      fd.append("leaveType", inputToSend);
      fd.append("startDate", form.startDate);
      fd.append("endDate", form.endDate);
      fd.append("duration", form.duration);
      fd.append("reason", form.reason);
      fd.append("ccUsers", JSON.stringify(selectedCC.map((u) => u.id)));
      if (attachment) fd.append("attachments", attachment);

      const res = await fetch("/api/leaves/apply", { method: "POST", body: fd });
      const json = await res.json();

      if (res.ok) {
        toast.success("Leave request submitted successfully!");
        onApplied?.();
        onClose();
        setForm({ leaveTypeName: "", startDate: "", endDate: "", duration: "full-day", reason: "" });
        setAttachment(null);
        setSelectedCC([]);
      } else {
        toast.error(json.error || "Failed to apply leave");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to apply leave");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ leaveTypeName: "", startDate: "", endDate: "", duration: "full-day", reason: "" });
    setAttachment(null);
    setSelectedCC([]);
    setCcSearch("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-emerald-400">
            Apply for Leave
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Leave Type <span className="text-rose-400">*</span>
            </label>
            <input
              list="leave-types"
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={form.leaveTypeName}
              onChange={(e) => setForm((s) => ({ ...s, leaveTypeName: e.target.value }))}
              placeholder="Select or type leave type"
            />
            <datalist id="leave-types">
              {(types || []).map((t) => (
                <option key={t._id} value={t.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Date Range <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2.5 text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.startDate}
                min={today}
                onChange={(e) => {
                  setForm((s) => ({ ...s, startDate: e.target.value }));
                  if (form.endDate && form.endDate < e.target.value) {
                    setForm((s) => ({ ...s, endDate: e.target.value }));
                  }
                }}
              />
              <input
                type="date"
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2.5 text-slate-100 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={form.endDate}
                min={form.startDate || today}
                onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Duration <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["full-day", "half-first", "half-second"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm((s) => ({ ...s, duration: d }))}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    form.duration === d
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
                      : "border-white/10 bg-slate-900/60 text-slate-400 hover:border-white/20 hover:text-slate-200"
                  }`}
                >
                  {d === "full-day" ? "Full Day" : d === "half-first" ? "First Half" : "Second Half"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              className="w-full min-h-[100px] rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              value={form.reason}
              onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
              placeholder="Please provide a reason for your leave..."
            />
          </div>

          <div ref={dropdownRef} className="relative">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              CC (Optional)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 py-2.5 pl-10 pr-4 text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                value={ccSearch}
                onChange={(e) => {
                  setCcSearch(e.target.value);
                  setCcDropdownOpen(true);
                }}
                onFocus={() => setCcDropdownOpen(true)}
                placeholder="Search users to CC..."
              />
            </div>
            {ccDropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl">
                {filteredUsers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">No users found</div>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => addCC(u)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-slate-800/80"
                    >
                      <div className="font-medium text-slate-200">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedCC.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCC.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400"
                  >
                    {u.firstName} {u.lastName}
                    <button
                      type="button"
                      onClick={() => removeCC(u.id)}
                      className="ml-1 rounded-full p-0.5 hover:bg-emerald-500/30"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Attachment (Optional)
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 py-6 transition hover:border-emerald-500/30 hover:bg-slate-900/40">
              <span className="text-sm text-slate-400">📎 Choose file</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
              {attachment && (
                <span className="mt-2 text-xs text-slate-500">Selected: {attachment.name}</span>
              )}
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={submit}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 py-3 font-semibold text-slate-900 shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-500/40 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Leave Request"}
          </button>
          <button
            onClick={resetForm}
            className="w-full rounded-xl border border-white/10 bg-transparent py-2.5 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          >
            Clear Form
          </button>
        </div>
      </div>
    </div>
  );
}
