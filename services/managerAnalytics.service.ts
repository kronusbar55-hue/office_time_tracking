import { PipelineStage, Types } from "mongoose";
import { Project } from "@/models/Project";
import { Task, type TaskPriority } from "@/models/Task";
import { User } from "@/models/User";

export const MANAGER_ANALYTICS_STATUSES = ["todo", "in_progress", "done", "qa"] as const;
export const MANAGER_ANALYTICS_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export type ManagerAnalyticsStatus = (typeof MANAGER_ANALYTICS_STATUSES)[number];
export type ManagerAnalyticsPriority = (typeof MANAGER_ANALYTICS_PRIORITIES)[number];

export type ManagerAnalyticsFilters = {
  projectIds: string[];
  statuses: ManagerAnalyticsStatus[];
  assigneeIds: string[];
  priorities: ManagerAnalyticsPriority[];
  startDate?: string;
  endDate?: string;
  organizationId?: string;
};

type AnalyticsContext = {
  match: Record<string, unknown>;
  teamMembers: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; memberIds: string[] }>;
};

type TeamStatsRow = {
  assigneeId: string;
  assigneeName: string;
  todo: number;
  inProgress: number;
  done: number;
  qa: number;
  total: number;
};

type BugStatsRow = {
  assigneeId: string;
  assigneeName: string;
  totalIssues: number;
  color: string;
};

type PlatformStatsRow = {
  status: string;
  admin: number;
  app: number;
  total: number;
};

type AnalyticsSnapshot = {
  teamStats: {
    rows: TeamStatsRow[];
    totals: Omit<TeamStatsRow, "assigneeId" | "assigneeName"> & { assigneeName: string };
  };
  bugStats: BugStatsRow[];
  platformStats: PlatformStatsRow[];
  meta: {
    totalFilteredTasks: number;
    totalBugIssues: number;
  };
};

const STATUS_LABELS: Record<ManagerAnalyticsStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  qa: "QA"
};

const CHART_COLORS = [
  "#3B82F6",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#22C55E",
  "#F97316"
];

function parseDateBoundary(value?: string, mode: "start" | "end" = "start") {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (mode === "end") {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function toObjectIds(values: string[]) {
  return values.filter((value) => Types.ObjectId.isValid(value)).map((value) => new Types.ObjectId(value));
}

async function buildAnalyticsContext(managerId: string, filters: ManagerAnalyticsFilters): Promise<AnalyticsContext> {
  const [projects, teamMembers] = await Promise.all([
    Project.find({
      members: managerId,
      status: { $ne: "archived" },
      name: { $not: /^(other|others|other\s+project)$/i }
    })
      .select("_id name members")
      .lean(),
    User.find({ manager: managerId, isDeleted: false, isActive: true }).select("_id firstName lastName").lean()
  ]);

  const availableProjects = projects.map((project: any) => ({
    id: project._id.toString(),
    name: project.name || "Untitled Project",
    memberIds: (project.members || []).map((memberId: any) => memberId.toString())
  }));

  const accessibleProjectIds = new Set(availableProjects.map((project) => project.id));

  if (filters.projectIds.some((projectId) => !accessibleProjectIds.has(projectId))) {
    throw new Error("Invalid project filter");
  }

  const scopedProjectIds = filters.projectIds.length
    ? filters.projectIds
    : availableProjects.map((project) => project.id);

  const scopedProjectObjectIds = toObjectIds(scopedProjectIds);

  const [projectTaskAssignees, projectMemberUsers] = await Promise.all([
    Task.distinct("assignee", {
      isDeleted: false,
      project: { $in: scopedProjectObjectIds },
      assignee: { $ne: null }
    }),
    User.find({
      _id: {
        $in: Array.from(
          new Set(
            availableProjects
              .filter((project) => scopedProjectIds.includes(project.id))
              .flatMap((project) => project.memberIds)
              .filter((memberId) => memberId !== managerId)
          )
        )
      },
      isDeleted: false,
      isActive: true
    })
      .select("_id firstName lastName")
      .lean()
  ]);

  const directReports = teamMembers.map((member: any) => ({
    id: member._id.toString(),
    name: `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unknown Member"
  }));

  const projectMembers = projectMemberUsers.map((member: any) => ({
    id: member._id.toString(),
    name: `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unknown Member"
  }));

  const extraAssigneeIds = projectTaskAssignees
    .map((assigneeId: any) => assigneeId?.toString?.() || "")
    .filter(Boolean);

  const knownAssigneeIds = new Set([...directReports, ...projectMembers].map((member) => member.id));
  const missingTaskAssigneeIds = extraAssigneeIds.filter((assigneeId) => !knownAssigneeIds.has(assigneeId));
  const missingTaskAssignees = missingTaskAssigneeIds.length
    ? await User.find({
        _id: { $in: toObjectIds(missingTaskAssigneeIds) },
        isDeleted: false,
        isActive: true
      })
        .select("_id firstName lastName")
        .lean()
    : [];

  const availableAssignees = [...directReports, ...projectMembers, ...missingTaskAssignees.map((member: any) => ({
    id: member._id.toString(),
    name: `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Unknown Member"
  }))].filter((member, index, source) => index === source.findIndex((item) => item.id === member.id));

  const accessibleAssigneeIds = new Set(availableAssignees.map((member) => member.id));

  if (filters.assigneeIds.some((assigneeId) => !accessibleAssigneeIds.has(assigneeId))) {
    throw new Error("Invalid assignee filter");
  }

  const match: Record<string, unknown> = {
    isDeleted: false,
    project: { $in: scopedProjectObjectIds }
  };

  if (filters.assigneeIds.length) {
    match.assignee = { $in: toObjectIds(filters.assigneeIds) };
  }

  if (filters.statuses.length) {
    match.status = { $in: filters.statuses };
  }

  if (filters.priorities.length) {
    match.priority = { $in: filters.priorities as TaskPriority[] };
  }

  const startDate = parseDateBoundary(filters.startDate, "start");
  const endDate = parseDateBoundary(filters.endDate, "end");
  if (startDate || endDate) {
    match.createdAt = {
      ...(startDate ? { $gte: startDate } : {}),
      ...(endDate ? { $lte: endDate } : {})
    };
  }

  if (filters.organizationId) {
    match.organizationId = filters.organizationId;
  }

  return {
    match,
    teamMembers: availableAssignees,
    projects: availableProjects
  };
}

function getTeamTotals(rows: TeamStatsRow[]) {
  return rows.reduce(
    (totals, row) => ({
      assigneeName: "Totals",
      todo: totals.todo + row.todo,
      inProgress: totals.inProgress + row.inProgress,
      done: totals.done + row.done,
      qa: totals.qa + row.qa,
      total: totals.total + row.total
    }),
    {
      assigneeName: "Totals",
      todo: 0,
      inProgress: 0,
      done: 0,
      qa: 0,
      total: 0
    }
  );
}

function getColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

export const ManagerAnalyticsService = {
  async getFilteredTasks(managerId: string, filters: ManagerAnalyticsFilters) {
    return buildAnalyticsContext(managerId, filters);
  },

  async getTeamStats(context: AnalyticsContext) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...context.match,
          status: {
            $in: MANAGER_ANALYTICS_STATUSES
          }
        }
      },
      {
        $group: {
          _id: {
            assignee: "$assignee",
            status: "$status"
          },
          count: { $sum: 1 }
        }
      }
    ];

    const grouped = await Task.aggregate(pipeline);
    const rows = context.teamMembers.map((member) => ({
      assigneeId: member.id,
      assigneeName: member.name,
      todo: 0,
      inProgress: 0,
      done: 0,
      qa: 0,
      total: 0
    }));

    const rowMap = new Map(rows.map((row) => [row.assigneeId, row]));

    grouped.forEach((item: any) => {
      const assigneeId = item?._id?.assignee?.toString();
      const status = item?._id?.status as ManagerAnalyticsStatus | undefined;
      if (!assigneeId || !status || !rowMap.has(assigneeId)) return;

      const row = rowMap.get(assigneeId)!;
      if (status === "todo") row.todo = item.count;
      if (status === "in_progress") row.inProgress = item.count;
      if (status === "done") row.done = item.count;
      if (status === "qa") row.qa = item.count;
      row.total = row.todo + row.inProgress + row.done + row.qa;
    });

    return {
      rows,
      totals: getTeamTotals(rows)
    };
  },

  async getBugStats(context: AnalyticsContext) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...context.match,
          type: /bug/i,
          assignee: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$assignee",
          totalIssues: { $sum: 1 }
        }
      },
      {
        $sort: {
          totalIssues: -1,
          _id: 1
        }
      }
    ];

    const assigneeMap = new Map(context.teamMembers.map((member) => [member.id, member.name]));
    const results = await Task.aggregate(pipeline);

    return results
      .map((item: any, index: number) => ({
        assigneeId: item._id?.toString() || "",
        assigneeName: assigneeMap.get(item._id?.toString() || "") || "Unknown Member",
        totalIssues: item.totalIssues || 0,
        color: getColor(index)
      }))
      .filter((item) => item.assigneeId);
  },

  async getPlatformStats(context: AnalyticsContext) {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...context.match,
          status: { $in: MANAGER_ANALYTICS_STATUSES }
        }
      },
      {
        $group: {
          _id: {
            status: "$status",
            labels: "$labels"
          },
          count: { $sum: 1 }
        }
      }
    ];

    const grouped = await Task.aggregate(pipeline);
    const rowMap = new Map<ManagerAnalyticsStatus, PlatformStatsRow>();

    MANAGER_ANALYTICS_STATUSES.forEach((status) => {
      rowMap.set(status, {
        status: STATUS_LABELS[status],
        admin: 0,
        app: 0,
        total: 0
      });
    });

    grouped.forEach((item: any) => {
      const status = item?._id?.status as ManagerAnalyticsStatus | undefined;
      const labels = (item?._id?.labels || []) as string[];
      if (!status || !rowMap.has(status)) return;

      const row = rowMap.get(status)!;
      const isApp = labels.some((l) => l.toLowerCase() === "app");
      const isAdmin = labels.some((l) => l.toLowerCase() === "admin");

      if (isAdmin) {
        row.admin += item.count || 0;
      }
      if (isApp) {
        row.app += item.count || 0;
      }
      // If none, we could still count it in total or skip. Subtitle says 'split across', so we only count those.
      row.total = row.admin + row.app;
    });

    return Array.from(rowMap.values());
  },

  async getAnalyticsSnapshot(managerId: string, filters: ManagerAnalyticsFilters): Promise<AnalyticsSnapshot> {
    const context = await this.getFilteredTasks(managerId, filters);

    const [teamStats, bugStats, platformStats, totalFilteredTasks] = await Promise.all([
      this.getTeamStats(context),
      this.getBugStats(context),
      this.getPlatformStats(context),
      Task.countDocuments(context.match)
    ]);

    return {
      teamStats,
      bugStats,
      platformStats,
      meta: {
        totalFilteredTasks,
        totalBugIssues: bugStats.reduce((sum, item) => sum + item.totalIssues, 0)
      }
    };
  },

  async getFilterOptions(managerId: string) {
    const projects = await Project.find({
      members: managerId,
      status: { $ne: "archived" },
      name: { $not: /^(other|others|other\s+project)$/i }
    })
      .select("_id name members")
      .lean();

    const projectIds = projects.map((project: any) => project._id.toString());
    const taskAssignees = await Task.aggregate([
      {
        $match: {
          isDeleted: false,
          project: { $in: toObjectIds(projectIds) },
          assignee: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$project",
          assigneeIds: { $addToSet: "$assignee" }
        }
      }
    ]);

    const taskAssigneeMap = new Map(
      taskAssignees.map((item: any) => [
        item._id.toString(),
        (item.assigneeIds || []).map((assigneeId: any) => assigneeId.toString())
      ])
    );

    const allRelevantUserIds = Array.from(
      new Set(
        projects
          .flatMap((project: any) => [
            ...(project.members || []).map((memberId: any) => memberId.toString()),
            ...(taskAssigneeMap.get(project._id.toString()) || [])
          ])
          .filter((userId) => userId !== managerId)
      )
    );

    const users = await User.find({
      _id: { $in: toObjectIds(allRelevantUserIds) },
      isDeleted: false,
      isActive: true
    })
      .select("_id firstName lastName")
      .lean();

    const userMap = new Map(
      users.map((user: any) => [
        user._id.toString(),
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown Member"
      ])
    );

    const projectOptions = projects.map((project: any) => ({
      id: project._id.toString(),
      name: project.name || "Untitled Project"
    }));

    const projectAssignees = Object.fromEntries(
      projects.map((project: any) => {
        const projectId = project._id.toString();
        const ids = Array.from(
          new Set([
            ...((project.members || []).map((memberId: any) => memberId.toString()).filter((userId: string) => userId !== managerId)),
            ...(taskAssigneeMap.get(projectId) || [])
          ])
        );

        return [
          projectId,
          ids
            .filter((userId) => userMap.has(userId))
            .map((userId) => ({
              id: userId,
              name: userMap.get(userId) || "Unknown Member"
            }))
            .sort((left, right) => left.name.localeCompare(right.name))
        ];
      })
    );

    return {
      projects: projectOptions,
      assignees: Array.from(
        new Map(
          Object.values(projectAssignees)
            .flat()
            .map((assignee: any) => [assignee.id, assignee])
        ).values()
      ),
      projectAssignees,
      statuses: MANAGER_ANALYTICS_STATUSES.map((status) => ({
        value: status,
        label: STATUS_LABELS[status]
      })),
      priorities: MANAGER_ANALYTICS_PRIORITIES.map((priority) => ({
        value: priority,
        label: priority
      }))
    };
  }
};
