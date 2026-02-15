"use client";

import { useState } from "react";
import { toast } from "react-toastify";

export default function LeaveActionPanel({
  leave,
  role,
  onDone,
}: {
  leave: any;
  role?: string | null;
  onDone?: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    try {
      const res = await fetch("/api/leaves/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: leave._id }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Leave approved");
        onDone?.();
      } else {
        toast.error(j.error || "Failed to approve");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }
    setRejecting(true);
    try {
      const res = await fetch("/api/leaves/reject", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: leave._id, managerComment: rejectReason }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Leave rejected");
        onDone?.();
        setShowRejectInput(false);
        setRejectReason("");
      } else {
        toast.error(j.error || "Failed to reject");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to reject");
    } finally {
      setRejecting(false);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch("/api/leaves/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: leave._id }),
      });
      const j = await res.json();
      if (res.ok) {
        toast.success("Leave request cancelled");
        onDone?.();
      } else {
        toast.error(j.error || "Failed to cancel");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to cancel");
    }
  };

  if (showRejectInput) {
    return (
      <div className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Rejection reason (optional)"
          className="w-full max-w-[200px] rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={rejecting}
            className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/30 disabled:opacity-50"
          >
            {rejecting ? "..." : "Confirm Reject"}
          </button>
          <button
            onClick={() => {
              setShowRejectInput(false);
              setRejectReason("");
            }}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {role === "admin" && leave.status === "pending" && (
        <>
          <button
            onClick={handleApprove}
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            Approve
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            className="rounded-lg bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/30"
          >
            Reject
          </button>
        </>
      )}
      {role !== "admin" && leave.status === "pending" && (
        <button
          onClick={handleCancel}
          className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Cancel Request
        </button>
      )}
    </div>
  );
}
