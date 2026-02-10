import type { AttendanceRecord } from "@/app/api/attendance/route";

interface StatusBadgeProps {
  status: AttendanceRecord["status"];
}

const statusConfig = {
  "checked-in": {
    label: "Checked In",
    bgColor: "bg-emerald-500/20",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/30"
  },
  "checked-out": {
    label: "Checked Out",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/30"
  },
  "on-break": {
    label: "On Break",
    bgColor: "bg-yellow-500/20",
    textColor: "text-yellow-400",
    borderColor: "border-yellow-500/30"
  },
  "not-checked-in": {
    label: "Not Checked In",
    bgColor: "bg-red-500/20",
    textColor: "text-red-400",
    borderColor: "border-red-500/30"
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-block rounded border px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.borderColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}
