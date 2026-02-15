"use client";

import LeaveReasonBox from "./LeaveReasonBox";
import LeaveAttachmentPreview from "./LeaveAttachmentPreview";
import LeaveStatusBadge from "./LeaveStatusBadge";
import LeaveActionPanel from "./LeaveActionPanel";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDuration(d: string) {
  const map: Record<string, string> = {
    "full-day": "Full Day",
    "half-first": "First Half",
    "half-second": "Second Half",
  };
  return map[d] || d;
}

export default function LeaveCard({
  leave,
  role,
  onDone,
}: {
  leave: any;
  role?: string | null;
  onDone?: () => void;
}) {
  const name =
    typeof leave.user === "object"
      ? `${leave.user.firstName || ""} ${leave.user.lastName || ""}`.trim() || "User"
      : "User";
  const email = typeof leave.user === "object" ? leave.user.email : "";
  const avatarUrl = typeof leave.user === "object" ? leave.user.avatarUrl : undefined;
  const leaveTypeName =
    typeof leave.leaveType === "object"
      ? leave.leaveType.name
      : leave.leaveType || "Leave";
  const ccUsers = leave.ccUsers || [];
  const ccEmails = Array.isArray(ccUsers)
    ? ccUsers
        .filter((u: any) => u && (u.email || (u.firstName && u.lastName)))
        .map((u: any) => u.email || `${u.firstName} ${u.lastName}`.trim())
    : [];

  return (
    <article className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-5 transition-all hover:border-emerald-500/20 hover:shadow-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {/* Header: Avatar + User + Status */}
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-semibold text-white">
                  {getInitials(name)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-slate-100">{name}</h3>
                <p className="text-sm text-slate-500">{email || leaveTypeName}</p>
              </div>
            </div>
            <LeaveStatusBadge status={leave.status} />
          </div>

          {/* Details grid */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Leave Type
              </label>
              <p className="font-medium text-slate-200">{leaveTypeName}</p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Duration
              </label>
              <p className="font-medium text-slate-200">
                {formatDuration(leave.duration)}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Start Date
              </label>
              <p className="font-medium text-slate-200">{leave.startDate}</p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
                End Date
              </label>
              <p className="font-medium text-slate-200">{leave.endDate}</p>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-4">
            <LeaveReasonBox reason={leave.reason} />
          </div>

          {/* CC */}
          {ccEmails.length > 0 && (
            <p className="mb-2 text-xs text-slate-500">
              CC: {ccEmails.join(", ")}
            </p>
          )}

          {/* Attachment */}
          <LeaveAttachmentPreview attachments={leave.attachments} />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3 lg:mt-0">
          <LeaveActionPanel leave={leave} role={role} onDone={onDone} />
        </div>
      </div>
    </article>
  );
}
