import type { AttendanceRecord } from "@/app/api/attendance/route";

interface AttendanceSummaryCardsProps {
  summary: {
    totalEmployees: number;
    checkedIn: number;
    checkedOut: number;
    onBreak: number;
    notCheckedIn: number;
  };
  activeFilter: AttendanceRecord["status"] | "all";
  onFilterChange: (filter: AttendanceRecord["status"] | "all") => void;
}

const cardConfigs = [
  {
    id: "all",
    label: "Total Employees",
    icon: "👥",
    bgGradient: "from-slate-500/20 to-slate-600/20",
    borderColor: "border-slate-500/30",
    iconBg: "bg-slate-500/20",
    countKey: "totalEmployees" as const
  },
  {
    id: "checked-in",
    label: "Checked In",
    icon: "✓",
    bgGradient: "from-emerald-500/20 to-emerald-600/20",
    borderColor: "border-emerald-500/30",
    iconBg: "bg-emerald-500/20",
    countKey: "checkedIn" as const
  },
  {
    id: "checked-out",
    label: "Checked Out",
    icon: "◀",
    bgGradient: "from-blue-500/20 to-blue-600/20",
    borderColor: "border-blue-500/30",
    iconBg: "bg-blue-500/20",
    countKey: "checkedOut" as const
  },
  {
    id: "not-checked-in",
    label: "Not Checked In",
    icon: "✗",
    bgGradient: "from-red-500/20 to-red-600/20",
    borderColor: "border-red-500/30",
    iconBg: "bg-red-500/20",
    countKey: "notCheckedIn" as const
  },
  {
    id: "on-break",
    label: "On Break",
    icon: "⏸",
    bgGradient: "from-yellow-500/20 to-yellow-600/20",
    borderColor: "border-yellow-500/30",
    iconBg: "bg-yellow-500/20",
    countKey: "onBreak" as const
  }
];

export function AttendanceSummaryCards({
  summary,
  activeFilter,
  onFilterChange
}: AttendanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
      {cardConfigs.map((card) => {
        const isActive =
          activeFilter === card.id ||
          (activeFilter === "all" && card.id === "all");
        const count = summary[card.countKey];

        return (
          <button
            key={card.id}
            onClick={() =>
              onFilterChange(
                card.id === "all" ? "all" : (card.id as AttendanceRecord["status"])
              )
            }
            className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${card.borderColor} ${
              isActive
                ? "bg-gradient-to-br " + card.bgGradient + " shadow-lg shadow-blue-500/20"
                : "bg-card/50 hover:bg-card/70"
            }`}
          >
            <div className="p-4">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg ${card.iconBg}`}
                >
                  {card.icon}
                </div>
                <div className="text-left flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-50">
                    {count}
                  </p>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
