export type DashboardRangeKey = "today" | "7d" | "30d" | "60d" | "custom";

export type DashboardFilterInput = {
  range?: string;
  start?: string;
  end?: string;
};

export type ResolvedDashboardDateRange = {
  key: DashboardRangeKey;
  startDate: Date;
  endDate: Date;
  startInput: string;
  endInput: string;
  label: string;
};

function toDayStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDayEnd(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatDateInput(date: Date) {
  return date.toISOString().split("T")[0];
}

export function resolveDashboardDateRange(
  filters?: DashboardFilterInput,
  now = new Date()
): ResolvedDashboardDateRange {
  const todayStart = toDayStart(now);
  const todayEnd = toDayEnd(now);
  const requestedKey = (filters?.range || "today") as DashboardRangeKey;

  if (requestedKey === "custom" && filters?.start && filters?.end) {
    const customStart = toDayStart(new Date(filters.start));
    const customEnd = toDayEnd(new Date(filters.end));

    if (
      !Number.isNaN(customStart.getTime()) &&
      !Number.isNaN(customEnd.getTime()) &&
      customStart <= customEnd
    ) {
      return {
        key: "custom",
        startDate: customStart,
        endDate: customEnd,
        startInput: formatDateInput(customStart),
        endInput: formatDateInput(customEnd),
        label: `${formatDateInput(customStart)} to ${formatDateInput(customEnd)}`
      };
    }
  }

  const presets: Record<Exclude<DashboardRangeKey, "custom">, { days: number; label: string }> = {
    today: { days: 1, label: "Today" },
    "7d": { days: 7, label: "Last 7 days" },
    "30d": { days: 30, label: "Last 30 days" },
    "60d": { days: 60, label: "Last 60 days" }
  };

  const safeKey = requestedKey in presets ? (requestedKey as Exclude<DashboardRangeKey, "custom">) : "today";
  const preset = presets[safeKey];
  const startDate = toDayStart(todayStart);
  startDate.setDate(startDate.getDate() - (preset.days - 1));

  return {
    key: safeKey,
    startDate,
    endDate: todayEnd,
    startInput: formatDateInput(startDate),
    endInput: formatDateInput(todayEnd),
    label: preset.label
  };
}
