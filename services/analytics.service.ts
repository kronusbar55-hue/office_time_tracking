import { endOfDay, format, parseISO, startOfDay, startOfWeek } from "date-fns";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { User } from "@/models/User";

const ACTIVE_CLICK_THRESHOLD = 1;
const ACTIVE_MOVEMENT_THRESHOLD = 40;
const ACTIVE_KEYPRESS_THRESHOLD = 3;
const INTERACTION_POINT_THRESHOLD = 12;
const IDLE_GAP_SECONDS = 120;
const MAX_IDLE_SECONDS_PER_GAP = 300;
const FOCUS_SESSION_MIN_SECONDS = 600;
const CACHE_TTL_MS = 20_000;

type RawMonitorRecord = {
  _id: string;
  userId?: string;
  employeeId?: string;
  organizationId?: string;
  timestamp?: Date | string;
  date?: string;
  time?: string;
  intervalStart?: string;
  intervalEnd?: string;
  createdAt?: Date | string;
  activeSeconds?: number;
  idleSeconds?: number;
  mouseClicks?: number;
  mouseMovements?: number;
  keyPresses?: number;
  status?: string;
  timezone?: string;
  appUsage?: Record<string, number> | Map<string, number>;
};

type NormalizedMonitorRecord = {
  id: string;
  userId: string;
  organizationId?: string;
  timestamp: Date;
  intervalStartAt: Date;
  intervalEndAt: Date;
  durationSeconds: number;
  mouseClicks: number;
  mouseMovements: number;
  keyPresses: number;
  interactionPoints: number;
  interactionPerMinute: number;
  isActive: boolean;
  status: string;
  appUsage: Record<string, number>;
  appDiversity: number;
  dominantAppShare: number;
  dayKey: string;
  weekKey: string;
  hourOfDay: number;
  dayOfWeek: number;
};

type FocusComputation = {
  focusSeconds: number;
  sessionCount: number;
  longestSessionSeconds: number;
};

type ActiveTimeComputation = {
  activeSeconds: number;
  idleSeconds: number;
  trackedSeconds: number;
  activeIntervals: number;
  idleIntervals: number;
};

type EmployeeMetrics = {
  employeeId: string;
  name: string;
  department: string;
  activeTimeSeconds: number;
  focusTimeSeconds: number;
  idleSeconds: number;
  trackedSeconds: number;
  interactionScore: number;
  productivityScore: number;
  totalClicks: number;
  totalMovements: number;
  totalKeyPresses: number;
  averageProductivity: number;
  bestWorkingHour: number;
  lowProductivityHour: number;
  peakActivityHour: number;
  irregularActivityCount: number;
  contextSwitches: number;
  frequentBreaks: number;
  lastSeenAt: Date | null;
  status: "Active" | "Needs Attention" | "Inactive";
  dailySeries: Array<{
    date: string;
    activeTimeSeconds: number;
    focusTimeSeconds: number;
    trackedSeconds: number;
    interactionScore: number;
    productivityScore: number;
  }>;
  weeklySeries: Array<{
    week: string;
    activeTimeSeconds: number;
    focusTimeSeconds: number;
    trackedSeconds: number;
    interactionScore: number;
    productivityScore: number;
  }>;
  heatmap: Array<{
    dayOfWeek: number;
    hour: number;
    productivity: number;
    activeSeconds: number;
  }>;
};

export type AnalyticsFilters = {
  startDate: string;
  endDate: string;
  employeeId?: string;
  department?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  filters: {
    startDate: string;
    endDate: string;
    employeeId?: string;
    department?: string;
    organizationId?: string;
  };
  overview: {
    totalEmployees: number;
    activeEmployeesToday: number;
    averageProductivityScore: number;
    totalActiveTimeSeconds: number;
    totalFocusTimeSeconds: number;
    dateRangeLabel: string;
    departments: string[];
  };
  productivity: {
    daily: Array<{
      date: string;
      productivityScore: number;
      activeTimeHours: number;
      focusTimeHours: number;
      interactionScore: number;
      activeEmployees: number;
    }>;
    weekly: Array<{
      week: string;
      productivityScore: number;
      activeTimeHours: number;
      focusTimeHours: number;
      interactionScore: number;
      activeEmployees: number;
    }>;
    employeeComparison: Array<{
      employeeId: string;
      name: string;
      department: string;
      productivityScore: number;
      activeTimeHours: number;
      focusTimeHours: number;
    }>;
    heatmap: Array<{
      dayOfWeek: number;
      dayLabel: string;
      hour: number;
      productivity: number;
      activeSeconds: number;
    }>;
  };
  employees: {
    rows: Array<{
      employeeId: string;
      name: string;
      department: string;
      activeTime: string;
      focusTime: string;
      productivityScore: number;
      interactionScore: number;
      status: "Active" | "Needs Attention" | "Inactive";
      bestWorkingHour: string;
      irregularPatterns: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  behavior: {
    bestWorkingHours: Array<{ hour: number; label: string; productivity: number }>;
    lowProductivityHours: Array<{ hour: number; label: string; productivity: number }>;
    peakActivityTime: { hour: number; label: string; activeTimeHours: number } | null;
    irregularWorkingPatterns: Array<{
      employeeId: string;
      name: string;
      department: string;
      irregularActivityCount: number;
      frequentBreaks: number;
      contextSwitches: number;
    }>;
    employeeTrends: Array<{
      employeeId: string;
      name: string;
      trend: "up" | "down" | "flat";
      delta: number;
      averageProductivity: number;
    }>;
  };
};

const analyticsCache = new Map<string, { expiresAt: number; snapshot: AnalyticsSnapshot }>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatHourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}

function normalizeAppUsage(appUsage: RawMonitorRecord["appUsage"]) {
  if (!appUsage) return {};
  if (appUsage instanceof Map) {
    return Object.fromEntries(appUsage.entries());
  }
  return Object.fromEntries(
    Object.entries(appUsage).map(([key, value]) => [key, safeNumber(value)])
  );
}

function buildCacheKey(filters: AnalyticsFilters) {
  return JSON.stringify({
    startDate: filters.startDate,
    endDate: filters.endDate,
    employeeId: filters.employeeId || "",
    department: filters.department || "",
    organizationId: filters.organizationId || "",
    page: filters.page || 1,
    limit: filters.limit || 10
  });
}

function getRecordUserId(record: RawMonitorRecord) {
  return String(record.userId || record.employeeId || "");
}

function getRecordTimestamp(record: RawMonitorRecord) {
  if (record.timestamp) return new Date(record.timestamp);
  if (record.intervalStart) return new Date(record.intervalStart);
  if (record.createdAt) return new Date(record.createdAt);
  if (record.date && record.time) {
    return new Date(`${record.date}T${record.time.length === 5 ? `${record.time}:00` : record.time}`);
  }
  if (record.date) return new Date(`${record.date}T00:00:00`);
  return new Date();
}

function getIntervalBounds(record: RawMonitorRecord) {
  const timestamp = getRecordTimestamp(record);
  const start = record.intervalStart ? new Date(record.intervalStart) : timestamp;
  const fallbackDuration = Math.max(1, safeNumber(record.activeSeconds) + safeNumber(record.idleSeconds)) || 300;
  const end = record.intervalEnd
    ? new Date(record.intervalEnd)
    : new Date(start.getTime() + fallbackDuration * 1000);

  const durationFromDates = Math.round((end.getTime() - start.getTime()) / 1000);
  const durationSeconds = clamp(
    durationFromDates > 0 ? durationFromDates : fallbackDuration,
    1,
    3600
  );

  return {
    timestamp,
    intervalStartAt: start,
    intervalEndAt: new Date(start.getTime() + durationSeconds * 1000),
    durationSeconds
  };
}

function getInteractionPoints(record: Pick<NormalizedMonitorRecord, "mouseClicks" | "mouseMovements" | "keyPresses">) {
  return record.mouseClicks * 4 + record.keyPresses * 2 + record.mouseMovements * 0.05;
}

function isActiveRecord(record: Pick<NormalizedMonitorRecord, "mouseClicks" | "mouseMovements" | "keyPresses" | "interactionPoints">) {
  return (
    record.mouseClicks >= ACTIVE_CLICK_THRESHOLD ||
    record.mouseMovements >= ACTIVE_MOVEMENT_THRESHOLD ||
    record.keyPresses >= ACTIVE_KEYPRESS_THRESHOLD ||
    record.interactionPoints >= INTERACTION_POINT_THRESHOLD
  );
}

function getDominantAppShare(appUsage: Record<string, number>) {
  const values = Object.values(appUsage);
  const total = values.reduce((sum, value) => sum + safeNumber(value), 0);
  if (!total) return 1;
  return Math.max(...values.map((value) => safeNumber(value) / total), 0);
}

function normalizeRecord(record: RawMonitorRecord): NormalizedMonitorRecord {
  const userId = getRecordUserId(record);
  const { timestamp, intervalStartAt, intervalEndAt, durationSeconds } = getIntervalBounds(record);
  const mouseClicks = safeNumber(record.mouseClicks);
  const mouseMovements = safeNumber(record.mouseMovements);
  const keyPresses = safeNumber(record.keyPresses);
  const interactionPoints = getInteractionPoints({ mouseClicks, mouseMovements, keyPresses });
  const interactionPerMinute = interactionPoints / Math.max(durationSeconds / 60, 1);
  const appUsage = normalizeAppUsage(record.appUsage);
  const dayKey = format(intervalStartAt, "yyyy-MM-dd");
  const weekKey = format(startOfWeek(intervalStartAt, { weekStartsOn: 1 }), "yyyy-MM-dd");

  return {
    id: String(record._id),
    userId,
    organizationId: record.organizationId,
    timestamp,
    intervalStartAt,
    intervalEndAt,
    durationSeconds,
    mouseClicks,
    mouseMovements,
    keyPresses,
    interactionPoints,
    interactionPerMinute,
    isActive: isActiveRecord({ mouseClicks, mouseMovements, keyPresses, interactionPoints }),
    status: String(record.status || ""),
    appUsage,
    appDiversity: Object.keys(appUsage).length,
    dominantAppShare: getDominantAppShare(appUsage),
    dayKey,
    weekKey,
    hourOfDay: record.time ? parseInt(record.time.split(":")[0]) : intervalStartAt.getHours(),
    dayOfWeek: intervalStartAt.getDay()
  };
}

export function calculateActiveTime(records: NormalizedMonitorRecord[]): ActiveTimeComputation {
  if (records.length === 0) {
    return { activeSeconds: 0, idleSeconds: 0, trackedSeconds: 0, activeIntervals: 0, idleIntervals: 0 };
  }

  const sorted = [...records].sort((a, b) => a.intervalStartAt.getTime() - b.intervalStartAt.getTime());
  let activeSeconds = 0;
  let idleSeconds = 0;
  let activeIntervals = 0;
  let idleIntervals = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];

    if (previous) {
      const gapSeconds = Math.max(
        0,
        Math.round((current.intervalStartAt.getTime() - previous.intervalEndAt.getTime()) / 1000)
      );
      if (gapSeconds >= IDLE_GAP_SECONDS) {
        idleSeconds += Math.min(gapSeconds, MAX_IDLE_SECONDS_PER_GAP);
      }
    }

    if (current.isActive) {
      activeSeconds += current.durationSeconds;
      activeIntervals += 1;
    } else {
      idleSeconds += Math.min(current.durationSeconds, MAX_IDLE_SECONDS_PER_GAP);
      idleIntervals += 1;
    }
  }

  return {
    activeSeconds,
    idleSeconds,
    trackedSeconds: activeSeconds + idleSeconds,
    activeIntervals,
    idleIntervals
  };
}

export function calculateFocusTime(records: NormalizedMonitorRecord[]): FocusComputation {
  if (records.length === 0) {
    return { focusSeconds: 0, sessionCount: 0, longestSessionSeconds: 0 };
  }

  const sorted = [...records].sort((a, b) => a.intervalStartAt.getTime() - b.intervalStartAt.getTime());
  let focusSeconds = 0;
  let sessionCount = 0;
  let longestSessionSeconds = 0;
  let currentSessionSeconds = 0;
  let previous: NormalizedMonitorRecord | null = null;

  const flush = () => {
    if (currentSessionSeconds >= FOCUS_SESSION_MIN_SECONDS) {
      focusSeconds += currentSessionSeconds;
      sessionCount += 1;
      longestSessionSeconds = Math.max(longestSessionSeconds, currentSessionSeconds);
    }
    currentSessionSeconds = 0;
  };

  for (const record of sorted) {
    const gapSeconds = previous
      ? Math.max(0, Math.round((record.intervalStartAt.getTime() - previous.intervalEndAt.getTime()) / 1000))
      : 0;
    const lowContextSwitching = record.appDiversity <= 3 && record.dominantAppShare >= 0.45;

    if (!record.isActive || !lowContextSwitching || gapSeconds > IDLE_GAP_SECONDS) {
      flush();
      previous = record;
      continue;
    }

    currentSessionSeconds += record.durationSeconds;
    previous = record;
  }

  flush();

  return { focusSeconds, sessionCount, longestSessionSeconds };
}

export function calculateProductivityScore(input: {
  activeSeconds: number;
  idleSeconds: number;
  trackedSeconds: number;
  focusSeconds: number;
  mouseClicks: number;
  mouseMovements: number;
  keyPresses: number;
}) {
  const trackedSeconds = Math.max(input.trackedSeconds, input.activeSeconds + input.idleSeconds, 1);
  const activeScore = clamp((input.activeSeconds / trackedSeconds) * 100, 0, 100);
  const focusScore = clamp((input.focusSeconds / Math.max(input.activeSeconds, 1)) * 100, 0, 100);
  const weightedInteractions =
    input.mouseClicks * 4 + input.keyPresses * 2 + input.mouseMovements * 0.05;
  const weightedPerMinute = weightedInteractions / Math.max(input.activeSeconds / 60, 1);
  const interactionScore = clamp((weightedPerMinute / 60) * 100, 0, 100);
  const score = clamp(focusScore * 0.5 + activeScore * 0.3 + interactionScore * 0.2, 0, 100);

  return {
    score: Math.round(score),
    activeScore: Math.round(activeScore),
    focusScore: Math.round(focusScore),
    interactionScore: Math.round(interactionScore)
  };
}

function computeHourlyScores(records: NormalizedMonitorRecord[]) {
  const hourly = new Map<number, { activeSeconds: number; scoreTotal: number; count: number }>();

  for (const record of records) {
    const existing = hourly.get(record.hourOfDay) || { activeSeconds: 0, scoreTotal: 0, count: 0 };
    const score = calculateProductivityScore({
      activeSeconds: record.isActive ? record.durationSeconds : 0,
      idleSeconds: record.isActive ? 0 : record.durationSeconds,
      trackedSeconds: record.durationSeconds,
      focusSeconds: 0,
      mouseClicks: record.mouseClicks,
      mouseMovements: record.mouseMovements,
      keyPresses: record.keyPresses
    }).score;

    existing.activeSeconds += record.isActive ? record.durationSeconds : 0;
    existing.scoreTotal += score;
    existing.count += 1;
    hourly.set(record.hourOfDay, existing);
  }

  return hourly;
}

function buildSeries(
  groupedRecords: Map<string, NormalizedMonitorRecord[]>,
  keyName: "date" | "week"
) {
  return [...groupedRecords.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, records]) => {
      const active = calculateActiveTime(records);
      const focus = calculateFocusTime(records);
      const totals = records.reduce(
        (accumulator, record) => {
          accumulator.mouseClicks += record.mouseClicks;
          accumulator.mouseMovements += record.mouseMovements;
          accumulator.keyPresses += record.keyPresses;
          return accumulator;
        },
        { mouseClicks: 0, mouseMovements: 0, keyPresses: 0 }
      );
      const score = calculateProductivityScore({
        activeSeconds: active.activeSeconds,
        idleSeconds: active.idleSeconds,
        trackedSeconds: active.trackedSeconds,
        focusSeconds: focus.focusSeconds,
        ...totals
      });

      return {
        [keyName]: key,
        activeTimeSeconds: active.activeSeconds,
        focusTimeSeconds: focus.focusSeconds,
        trackedSeconds: active.trackedSeconds,
        interactionScore: score.interactionScore,
        productivityScore: score.score
      };
    });
}

function deriveTrend(dailySeries: EmployeeMetrics["dailySeries"]) {
  if (dailySeries.length < 2) return { trend: "flat" as const, delta: 0 };
  const midpoint = Math.ceil(dailySeries.length / 2);
  const firstHalf = dailySeries.slice(0, midpoint);
  const secondHalf = dailySeries.slice(midpoint);
  const firstAverage = firstHalf.reduce((sum, day) => sum + day.productivityScore, 0) / Math.max(firstHalf.length, 1);
  const secondAverage = secondHalf.reduce((sum, day) => sum + day.productivityScore, 0) / Math.max(secondHalf.length, 1);
  const delta = Math.round(secondAverage - firstAverage);

  if (delta >= 5) return { trend: "up" as const, delta };
  if (delta <= -5) return { trend: "down" as const, delta };
  return { trend: "flat" as const, delta };
}

export function getBehaviorPatterns(records: NormalizedMonitorRecord[], employees: EmployeeMetrics[]) {
  const hourly = new Map<number, { scoreSum: number; interactionSum: number; count: number; activeSeconds: number; focusSeconds: number; mouseClicks: number; mouseMovements: number; keyPresses: number }>();

  for (const record of records) {
    const current = hourly.get(record.hourOfDay) || { scoreSum: 0, interactionSum: 0, count: 0, activeSeconds: 0, focusSeconds: 0, mouseClicks: 0, mouseMovements: 0, keyPresses: 0 };
    
    // We compute a momentary score for this 5-min block to help with the organization-wide average
    const momentary = calculateProductivityScore({
      activeSeconds: record.isActive ? record.durationSeconds : 0,
      idleSeconds: record.isActive ? 0 : record.durationSeconds,
      trackedSeconds: record.durationSeconds,
      focusSeconds: 0, // moment score doesn't account for focus sessions
      mouseClicks: record.mouseClicks,
      mouseMovements: record.mouseMovements,
      keyPresses: record.keyPresses
    });

    current.scoreSum += momentary.score;
    current.interactionSum += momentary.interactionScore;
    current.count += 1;
    current.activeSeconds += record.isActive ? record.durationSeconds : 0;
    current.mouseClicks += record.mouseClicks;
    current.mouseMovements += record.mouseMovements;
    current.keyPresses += record.keyPresses;
    hourly.set(record.hourOfDay, current);
  }

  const hourlyList = [...hourly.entries()]
    .filter(([hour]) => hour >= 10 && hour <= 19)
    .map(([hour, value]) => ({
      hour,
      label: formatHourLabel(hour),
      productivity: Math.round(value.scoreSum / Math.max(value.count, 1)),
      interaction: Math.round(value.interactionSum / Math.max(value.count, 1)),
      activeTimeHours: Number((value.activeSeconds / 3600).toFixed(2))
    }));

  const bestWorkingHours = [...hourlyList]
    .filter(h => h.activeTimeHours > 0)
    .sort((left, right) => right.productivity - left.productivity || right.interaction - left.interaction)
    .slice(0, 3)
    .map(({ hour, label, productivity }) => ({ hour, label, productivity }));

  const lowProductivityHours = [...hourlyList]
    .filter((item) => item.activeTimeHours > 0)
    .sort((left, right) => left.productivity - right.productivity || left.interaction - right.interaction)
    .slice(0, 3)
    .map(({ hour, label, productivity }) => ({ hour, label, productivity }));

  const peakActivity = [...hourlyList].sort((left, right) => right.activeTimeHours - left.activeTimeHours)[0] || null;

  const irregularWorkingPatterns = [...employees]
    .filter((employee) => employee.irregularActivityCount > 0 || employee.frequentBreaks > 0 || employee.contextSwitches > 0)
    .sort((left, right) => right.irregularActivityCount - left.irregularActivityCount || right.frequentBreaks - left.frequentBreaks)
    .slice(0, 5)
    .map((employee) => ({
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      irregularActivityCount: employee.irregularActivityCount,
      frequentBreaks: employee.frequentBreaks,
      contextSwitches: employee.contextSwitches
    }));

  const employeeTrends = employees.map((employee) => {
    const trend = deriveTrend(employee.dailySeries);
    return {
      employeeId: employee.employeeId,
      name: employee.name,
      trend: trend.trend,
      delta: trend.delta,
      averageProductivity: employee.averageProductivity
    };
  });

  return {
    bestWorkingHours,
    lowProductivityHours,
    peakActivityTime: peakActivity
      ? {
          hour: peakActivity.hour,
          label: peakActivity.label,
          activeTimeHours: peakActivity.activeTimeHours
        }
      : null,
    irregularWorkingPatterns,
    employeeTrends
  };
}

async function resolveEmployees(filters: AnalyticsFilters) {
  const query: Record<string, unknown> = {
    isDeleted: false,
    role: { $ne: "admin" }
  };

  if (filters.employeeId) {
    query._id = filters.employeeId;
  }

  if (filters.department && filters.department !== "all") {
    query.department = filters.department;
  }

  const users = await User.find(query)
    .select("_id firstName lastName department isActive")
    .lean();

  return users.map((user: any) => ({
    id: String(user._id),
    name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown Employee",
    department: String(user.department || "General"),
    isActive: Boolean(user.isActive)
  }));
}

async function fetchRawMonitorRecords(filters: AnalyticsFilters, userIds: string[]) {
  if (userIds.length === 0) return [];

  const start = startOfDay(parseISO(filters.startDate));
  const end = endOfDay(parseISO(filters.endDate));
  const clauses: Record<string, unknown>[] = [
    { $or: [{ userId: { $in: userIds } }, { employeeId: { $in: userIds } }] },
    {
      $or: [
        { timestamp: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
        { date: { $gte: filters.startDate, $lte: filters.endDate } }
      ]
    }
  ];

  if (filters.organizationId) {
    clauses.push({ organizationId: filters.organizationId });
  }

  return (await EmployeeMonitor.find({ $and: clauses })
    .select(
      "_id userId employeeId organizationId timestamp date time intervalStart intervalEnd createdAt activeSeconds idleSeconds mouseClicks mouseMovements keyPresses status timezone appUsage"
    )
    .sort({ userId: 1, employeeId: 1, intervalStart: 1, timestamp: 1, createdAt: 1 })
    .lean()) as RawMonitorRecord[];
}

async function getActiveEmployeesToday(userIds: string[], organizationId?: string) {
  if (userIds.length === 0) return 0;

  const today = format(new Date(), "yyyy-MM-dd");
  const match: Record<string, unknown> = {
    $or: [{ userId: { $in: userIds } }, { employeeId: { $in: userIds } }],
    date: today,
    status: { $ne: "ON_BREAK" }
  };

  if (organizationId) {
    match.organizationId = organizationId;
  }

  const activeToday = await EmployeeMonitor.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $ifNull: ["$userId", "$employeeId"]
        },
        totalClicks: { $sum: "$mouseClicks" },
        totalMovements: { $sum: "$mouseMovements" },
        totalKeys: { $sum: "$keyPresses" }
      }
    },
    {
      $project: {
        isActive: {
          $gt: [
            {
              $add: [
                { $multiply: ["$totalClicks", 4] },
                { $multiply: ["$totalKeys", 2] },
                { $multiply: ["$totalMovements", 0.05] }
              ]
            },
            INTERACTION_POINT_THRESHOLD
          ]
        }
      }
    },
    { $match: { isActive: true } },
    { $count: "count" }
  ]);

  return safeNumber(activeToday[0]?.count);
}

function computeEmployeeMetrics(employee: Awaited<ReturnType<typeof resolveEmployees>>[number], records: NormalizedMonitorRecord[]): EmployeeMetrics {
  const active = calculateActiveTime(records);
  const focus = calculateFocusTime(records);
  const totals = records.reduce(
    (accumulator, record) => {
      accumulator.clicks += record.mouseClicks;
      accumulator.movements += record.mouseMovements;
      accumulator.keys += record.keyPresses;
      if (record.appDiversity >= 4) accumulator.contextSwitches += 1;
      if (!record.isActive) accumulator.frequentBreaks += 1;
      return accumulator;
    },
    { clicks: 0, movements: 0, keys: 0, contextSwitches: 0, frequentBreaks: 0 }
  );

  const score = calculateProductivityScore({
    activeSeconds: active.activeSeconds,
    idleSeconds: active.idleSeconds,
    trackedSeconds: active.trackedSeconds,
    focusSeconds: focus.focusSeconds,
    mouseClicks: totals.clicks,
    mouseMovements: totals.movements,
    keyPresses: totals.keys
  });

  const dailyGroups = new Map<string, NormalizedMonitorRecord[]>();
  const weeklyGroups = new Map<string, NormalizedMonitorRecord[]>();
  const heatmapGroups = new Map<string, { activeSeconds: number; productivityTotal: number; count: number }>();
  const hourlyScores = computeHourlyScores(records);

  for (const record of records) {
    dailyGroups.set(record.dayKey, [...(dailyGroups.get(record.dayKey) || []), record]);
    weeklyGroups.set(record.weekKey, [...(weeklyGroups.get(record.weekKey) || []), record]);

    const heatmapKey = `${record.dayOfWeek}-${record.hourOfDay}`;
    const currentHeat = heatmapGroups.get(heatmapKey) || { activeSeconds: 0, productivityTotal: 0, count: 0 };
    const pointScore = calculateProductivityScore({
      activeSeconds: record.isActive ? record.durationSeconds : 0,
      idleSeconds: record.isActive ? 0 : record.durationSeconds,
      trackedSeconds: record.durationSeconds,
      focusSeconds: 0,
      mouseClicks: record.mouseClicks,
      mouseMovements: record.mouseMovements,
      keyPresses: record.keyPresses
    }).score;

    currentHeat.activeSeconds += record.isActive ? record.durationSeconds : 0;
    currentHeat.productivityTotal += pointScore;
    currentHeat.count += 1;
    heatmapGroups.set(heatmapKey, currentHeat);
  }

  const dailySeries = buildSeries(dailyGroups, "date") as EmployeeMetrics["dailySeries"];
  const weeklySeries = buildSeries(weeklyGroups, "week") as EmployeeMetrics["weeklySeries"];

  const heatmap = [...heatmapGroups.entries()].map(([key, value]) => {
    const [dayOfWeek, hour] = key.split("-").map(Number);
    return {
      dayOfWeek,
      hour,
      productivity: Math.round(value.productivityTotal / Math.max(value.count, 1)),
      activeSeconds: value.activeSeconds
    };
  });

  const personalAverageHour = records.length
    ? records.reduce((sum, record) => sum + record.hourOfDay, 0) / records.length
    : 9;
  const irregularActivityCount = records.filter((record) => Math.abs(record.hourOfDay - personalAverageHour) >= 4).length;
  const bestHourEntry = [...hourlyScores.entries()].sort((left, right) => right[1].scoreTotal / Math.max(right[1].count, 1) - left[1].scoreTotal / Math.max(left[1].count, 1))[0];
  const lowHourEntry = [...hourlyScores.entries()]
    .filter(([, value]) => value.activeSeconds > 0)
    .sort((left, right) => left[1].scoreTotal / Math.max(left[1].count, 1) - right[1].scoreTotal / Math.max(right[1].count, 1))[0];
  const peakHourEntry = [...hourlyScores.entries()].sort((left, right) => right[1].activeSeconds - left[1].activeSeconds)[0];
  const lastSeenAt = records.length ? records[records.length - 1].intervalEndAt : null;
  const lastActiveRecord = [...records].reverse().find((record) => record.isActive);
  const status: EmployeeMetrics["status"] = !lastActiveRecord
    ? "Inactive"
    : score.score >= 70
      ? "Active"
      : "Needs Attention";

  return {
    employeeId: employee.id,
    name: employee.name,
    department: employee.department,
    activeTimeSeconds: active.activeSeconds,
    focusTimeSeconds: focus.focusSeconds,
    idleSeconds: active.idleSeconds,
    trackedSeconds: active.trackedSeconds,
    interactionScore: score.interactionScore,
    productivityScore: score.score,
    totalClicks: totals.clicks,
    totalMovements: totals.movements,
    totalKeyPresses: totals.keys,
    averageProductivity: dailySeries.length
      ? Math.round(dailySeries.reduce((sum, day) => sum + day.productivityScore, 0) / dailySeries.length)
      : score.score,
    bestWorkingHour: bestHourEntry?.[0] ?? 9,
    lowProductivityHour: lowHourEntry?.[0] ?? bestHourEntry?.[0] ?? 9,
    peakActivityHour: peakHourEntry?.[0] ?? 9,
    irregularActivityCount,
    contextSwitches: totals.contextSwitches,
    frequentBreaks: totals.frequentBreaks,
    lastSeenAt,
    status,
    dailySeries,
    weeklySeries,
    heatmap
  };
}

function aggregateRecordsToTimeline(records: NormalizedMonitorRecord[], keySelector: (record: NormalizedMonitorRecord) => string) {
  const groups = new Map<string, { activeSeconds: number; idleSeconds: number; focusSeconds: number; mouseClicks: number; mouseMovements: number; keyPresses: number; count: number }>();

  for (const record of records) {
    const key = keySelector(record);
    const current = groups.get(key) || { activeSeconds: 0, idleSeconds: 0, focusSeconds: 0, mouseClicks: 0, mouseMovements: 0, keyPresses: 0, count: 0 };
    
    if (record.isActive) {
      current.activeSeconds += record.durationSeconds;
    } else {
      current.idleSeconds += record.durationSeconds;
    }
    
    current.mouseClicks += record.mouseClicks;
    current.mouseMovements += record.mouseMovements;
    current.keyPresses += record.keyPresses;
    current.count += 1;
    groups.set(key, current);
  }

  // We still need focus time per group, but focus time calculation needs sorted sequences per user.
  // To keep it simple and accurate, we can sum the focus time from employeeMetrics if we have it, 
  // or re-calculate focus sessions for the group (harder due to interleaved user records).
  // I'll take the sum from pre-calculated per-employee segments for the specific keys.

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const stats = calculateProductivityScore({
        activeSeconds: value.activeSeconds,
        idleSeconds: value.idleSeconds,
        trackedSeconds: value.activeSeconds + value.idleSeconds,
        focusSeconds: 0, // Focus will be added later or ignored for simple timeline
        mouseClicks: value.mouseClicks,
        mouseMovements: value.mouseMovements,
        keyPresses: value.keyPresses
      });

      return {
        key,
        productivityScore: stats.score,
        activeTimeHours: Number((value.activeSeconds / 3600).toFixed(2)),
        focusTimeHours: 0, // Placeholder
        interactionScore: stats.interactionScore,
        activeEmployees: value.count // This is count of intervals, not unique employees
      };
    });
}

export class AnalyticsService {
  static async getAnalyticsSnapshot(filters: AnalyticsFilters): Promise<AnalyticsSnapshot> {
    const cacheKey = buildCacheKey(filters);
    const cached = analyticsCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.snapshot;
    }

    const employees = await resolveEmployees(filters);
    const userIds = employees.map((employee) => employee.id);
    const rawRecords = await fetchRawMonitorRecords(filters, userIds);
    const normalizedRecords = rawRecords
      .map(normalizeRecord)
      .filter((record) => {
        const isTargetUser = userIds.includes(record.userId);
        const isNotOnBreak = record.status !== "ON_BREAK";
        
        // Filter for office hours: 10:30 AM to 8:00 PM
        // Hour 10 is allowed if it's 10:30+, but for simplicity at this stage we allow the whole hour block
        // Hour 19 is 7 PM to 7:59 PM.
        const hour = record.hourOfDay;
        const isOfficeHour = hour >= 10 && hour <= 19;
        
        return isTargetUser && isNotOnBreak && isOfficeHour;
      })
      .sort((left, right) => left.intervalStartAt.getTime() - right.intervalStartAt.getTime());

    const recordsByEmployee = new Map<string, NormalizedMonitorRecord[]>();
    for (const record of normalizedRecords) {
      recordsByEmployee.set(record.userId, [...(recordsByEmployee.get(record.userId) || []), record]);
    }

    const employeeMetrics = employees.map((employee) =>
      computeEmployeeMetrics(employee, recordsByEmployee.get(employee.id) || [])
    );

    const dailyIndices = new Map<string, { focusSeconds: number; employees: Set<string> }>();
    for (const emp of employeeMetrics) {
      for (const day of emp.dailySeries) {
        const cur = dailyIndices.get(day.date) || { focusSeconds: 0, employees: new Set() };
        cur.focusSeconds += day.focusTimeSeconds;
        cur.employees.add(emp.employeeId);
        dailyIndices.set(day.date, cur);
      }
    }

    const daily = aggregateRecordsToTimeline(normalizedRecords, (r) => r.dayKey).map((row) => {
      const extra = dailyIndices.get(row.key) || { focusSeconds: 0, employees: new Set() };
      return {
        date: row.key,
        productivityScore: row.productivityScore,
        activeTimeHours: row.activeTimeHours,
        focusTimeHours: Number((extra.focusSeconds / 3600).toFixed(2)),
        interactionScore: row.interactionScore,
        activeEmployees: extra.employees.size
      };
    });

    const weeklyIndices = new Map<string, { focusSeconds: number; employees: Set<string> }>();
    for (const emp of employeeMetrics) {
      for (const week of emp.weeklySeries) {
        const cur = weeklyIndices.get(week.week) || { focusSeconds: 0, employees: new Set() };
        cur.focusSeconds += week.focusTimeSeconds;
        cur.employees.add(emp.employeeId);
        weeklyIndices.set(week.week, cur);
      }
    }

    const weekly = aggregateRecordsToTimeline(normalizedRecords, (r) => r.weekKey).map((row) => {
      const extra = weeklyIndices.get(row.key) || { focusSeconds: 0, employees: new Set() };
      return {
        week: row.key,
        productivityScore: row.productivityScore,
        activeTimeHours: row.activeTimeHours,
        focusTimeHours: Number((extra.focusSeconds / 3600).toFixed(2)),
        interactionScore: row.interactionScore,
        activeEmployees: extra.employees.size
      };
    });

    const heatmapMap = new Map<string, { productivityTotal: number; activeSeconds: number; count: number }>();
    for (const employee of employeeMetrics) {
      for (const point of employee.heatmap) {
        const key = `${point.dayOfWeek}-${point.hour}`;
        const current = heatmapMap.get(key) || { productivityTotal: 0, activeSeconds: 0, count: 0 };
        current.productivityTotal += point.productivity;
        current.activeSeconds += point.activeSeconds;
        current.count += 1;
        heatmapMap.set(key, current);
      }
    }

    const heatmap = [...heatmapMap.entries()].map(([key, value]) => {
      const [dayOfWeek, hour] = key.split("-").map(Number);
      return {
        dayOfWeek,
        dayLabel: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek] || "N/A",
        hour,
        productivity: Math.round(value.productivityTotal / Math.max(value.count, 1)),
        activeSeconds: value.activeSeconds
      };
    });

    const activeEmployeesToday = await getActiveEmployeesToday(userIds, filters.organizationId);
    const totalActiveTimeSeconds = employeeMetrics.reduce((sum, employee) => sum + employee.activeTimeSeconds, 0);
    const totalFocusTimeSeconds = employeeMetrics.reduce((sum, employee) => sum + employee.focusTimeSeconds, 0);
    const averageProductivityScore = employeeMetrics.length
      ? Math.round(employeeMetrics.reduce((sum, employee) => sum + employee.productivityScore, 0) / employeeMetrics.length)
      : 0;

    const allDepartments = [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort((left, right) => left.localeCompare(right));
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const employeeRows = employeeMetrics
      .sort((left, right) => right.productivityScore - left.productivityScore || right.activeTimeSeconds - left.activeTimeSeconds);
    const paginatedRows = employeeRows.slice((page - 1) * limit, page * limit);

    const snapshot: AnalyticsSnapshot = {
      generatedAt: new Date().toISOString(),
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        employeeId: filters.employeeId,
        department: filters.department,
        organizationId: filters.organizationId
      },
      overview: {
        totalEmployees: employees.length,
        activeEmployeesToday,
        averageProductivityScore,
        totalActiveTimeSeconds,
        totalFocusTimeSeconds,
        dateRangeLabel: `${filters.startDate} to ${filters.endDate}`,
        departments: allDepartments
      },
      productivity: {
        daily,
        weekly,
        employeeComparison: employeeRows.slice(0, 10).map((employee) => ({
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          productivityScore: employee.productivityScore,
          activeTimeHours: Number((employee.activeTimeSeconds / 3600).toFixed(2)),
          focusTimeHours: Number((employee.focusTimeSeconds / 3600).toFixed(2))
        })),
        heatmap
      },
      employees: {
        rows: paginatedRows.map((employee) => ({
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          activeTime: formatDuration(employee.activeTimeSeconds),
          focusTime: formatDuration(employee.focusTimeSeconds),
          productivityScore: employee.productivityScore,
          interactionScore: employee.interactionScore,
          status: employee.status,
          bestWorkingHour: formatHourLabel(employee.bestWorkingHour),
          irregularPatterns: employee.irregularActivityCount
        })),
        pagination: {
          page,
          limit,
          total: employeeRows.length,
          totalPages: Math.max(1, Math.ceil(employeeRows.length / limit))
        }
      },
      behavior: getBehaviorPatterns(normalizedRecords, employeeMetrics)
    };

    analyticsCache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      snapshot
    });

    return snapshot;
  }
}
