import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import SubTask from "@/models/SubTask";
import IssueDependency from "@/models/IssueDependency";
import IssueHierarchy from "@/models/IssueHierarchy";
import { TimeLog } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * Generate hierarchy-specific reports
 */
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const projectId = searchParams.get("projectId") || undefined;
    const issueId = searchParams.get("issueId") || undefined;

    if (!type) {
      return NextResponse.json(
        errorResp("Missing report type"),
        { status: 400 }
      );
    }

    let result = {};

    switch (type) {
      case "hierarchy_progress":
        result = await getHierarchyProgressReport(projectId || issueId);
        break;

      case "blocked_tasks":
        result = await getBlockedTasksReport(projectId||undefined);
        break;

      case "subtask_distribution":
        result = await getSubTaskDistributionReport(projectId);
        break;

      case "dependency_chain":
        result = await getDependencyChainReport(issueId);
        break;

      case "completion_timeline":
        result = await getCompletionTimelineReport(projectId);
        break;

      case "subtask_time_tracking":
        result = await getSubTaskTimeTrackingReport(projectId);
        break;

      default:
        return NextResponse.json(
          errorResp(`Unknown report type: ${type}`),
          { status: 400 }
        );
    }

    return NextResponse.json(successResp("Report generated", result));
  } catch (err: any) {
    console.error("[jira/hierarchy-reports/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate report", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Get hierarchy progress: Epic → Story → Task → SubTask progress
 */
async function getHierarchyProgressReport(issueId?: string) {
  let issues: any[] = [];

  if (issueId) {
    // Get single issue and its hierarchy
    const issue = await Task.findById(issueId).lean();
    if (issue) issues = [issue];
  } else {
    // Get all issues with sub-tasks
    issues = await Task.find({ type: { $in: ["epic", "story", "task"] } })
      .select("_id key type title childTasks")
      .lean();
  }

  const report = await Promise.all(
    issues.map(async (issue: any) => {
      const subTasks = await SubTask.find({
        parentTask: issue._id,
        isDeleted: false
      })
        .select("status priority")
        .lean();

      const total = subTasks.length;
      const done = subTasks.filter((st) => st.status === "done").length;
      const inProgress = subTasks.filter((st) => st.status === "in_progress").length;

      return {
        issueKey: issue.key,
        issueType: issue.type,
        totalSubTasks: total,
        completedSubTasks: done,
        inProgressSubTasks: inProgress,
        blockingSubTasks: subTasks.filter((st) => st.status === "blocked").length,
        completionPercent: total > 0 ? Math.round((done / total) * 100) : 0
      };
    })
  );

  return { type: "hierarchy_progress", data: report };
}

/**
 * Get blocked tasks report with their blockers
 */
async function getBlockedTasksReport(projectId?: string) {
  const filter: any = { status: "active" };

  const blockedDependencies = await IssueDependency.find(filter)
    .populate("sourceIssue", "key title")
    .populate("targetIssue", "key title priority")
    .lean();

  const blockedTasks = blockedDependencies
    .filter((dep: any) => dep.type === "blocks")
    .map((dep: any) => ({
      blockedIssueKey: dep.targetIssue?.key,
      blockedIssueTitle: dep.targetIssue?.title,
      blockerKey: dep.sourceIssue?.key,
      blockerTitle: dep.sourceIssue?.title,
      blockerPriority: dep.targetIssue?.priority,
      blockingDays: Math.floor(
        (new Date().getTime() - new Date(dep.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      )
    }));

  const criticalBlockers = blockedTasks.filter(
    (task: any) => task.blockerPriority === "critical"
  );

  return {
    type: "blocked_tasks",
    totalBlocked: blockedTasks.length,
    criticalBlockers: criticalBlockers.length,
    data: blockedTasks
  };
}

/**
 * Subtask distribution across team
 */
async function getSubTaskDistributionReport(projectId?: string) {
  const subTasks = await SubTask.find(
    projectId ? { parentTask: { $in: await Task.find({ project: projectId }).select("_id") } } : {}
  )
    .populate("assignee", "firstName lastName")
    .select("assignee status priority")
    .lean();

  const distribution: { [key: string]: any } = {};

  for (const subTask of subTasks) {
    const assigneeKey = subTask.assignee?.firstName + " " + (subTask.assignee?.lastName || "");
    if (!distribution[assigneeKey]) {
      distribution[assigneeKey] = {
        total: 0,
        done: 0,
        inProgress: 0,
        blocked: 0,
        highPriority: 0
      };
    }

    distribution[assigneeKey].total++;
    if (subTask.status === "done") distribution[assigneeKey].done++;
    if (subTask.status === "in_progress") distribution[assigneeKey].inProgress++;
    if (subTask.status === "blocked") distribution[assigneeKey].blocked++;
    if (subTask.priority === "critical" || subTask.priority === "high")
      distribution[assigneeKey].highPriority++;
  }

  return {
    type: "subtask_distribution",
    assigneeMetrics: Object.entries(distribution).map(([name, metrics]: any) => ({
      assignee: name || "Unassigned",
      ...metrics,
      completionPercent:
        metrics.total > 0 ? Math.round((metrics.done / metrics.total) * 100) : 0
    }))
  };
}

/**
 * Dependency chain analysis
 */
async function getDependencyChainReport(issueId?: string) {
  if (!issueId) {
    return { type: "dependency_chain", error: "issueId required" };
  }

  // Get all dependencies for this issue
  const outbound = await IssueDependency.find({
    sourceIssue: issueId,
    status: "active"
  })
    .populate("targetIssue", "key title status")
    .lean();

  const inbound = await IssueDependency.find({
    targetIssue: issueId,
    status: "active"
  })
    .populate("sourceIssue", "key title status")
    .lean();

  return {
    type: "dependency_chain",
    issueId,
    blockedBy: inbound.map((dep: any) => ({
      sourceKey: dep.sourceIssue?.key,
      sourceStatus: dep.sourceIssue?.status,
      type: dep.type
    })),
    blocks: outbound.map((dep: any) => ({
      targetKey: dep.targetIssue?.key,
      targetStatus: dep.targetIssue?.status,
      type: dep.type
    }))
  };
}

/**
 * Completion timeline: when sub-tasks were completed
 */
async function getCompletionTimelineReport(projectId?: string) {
  const completedSubTasks = await SubTask.find({
    status: "done",
    isDeleted: false
  })
    .select("key parentTask updatedAt")
    .lean()
    .sort({ updatedAt: 1 });

  // Group by week
  const timeline: { [key: string]: number } = {};

  for (const subTask of completedSubTasks) {
    const date = new Date(subTask.updatedAt);
    const week = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    const weekKey = `Week ${week} of ${date.getFullYear()}`;

    timeline[weekKey] = (timeline[weekKey] || 0) + 1;
  }

  return {
    type: "completion_timeline",
    totalCompleted: completedSubTasks.length,
    timeline: Object.entries(timeline).map(([week, count]) => ({
      period: week,
      completedCount: count
    }))
  };
}

/**
 * Time tracking per sub-task
 */
async function getSubTaskTimeTrackingReport(projectId?: string) {
  const timeLogs = await TimeLog.aggregate([
    {
      $group: {
        _id: "$issue",
        totalTime: { $sum: "$timeSpentMinutes" },
        billableTime: {
          $sum: {
            $cond: ["$isBillable", "$timeSpentMinutes", 0]
          }
        },
        logCount: { $sum: 1 }
      }
    }
  ]);

  return {
    type: "subtask_time_tracking",
    totalLogged: timeLogs.reduce((sum: number, log: any) => sum + log.totalTime, 0),
    totalBillable: timeLogs.reduce(
      (sum: number, log: any) => sum + log.billableTime,
      0
    ),
    entries: timeLogs.map((log: any) => ({
      issueId: log._id.toString(),
      totalMinutes: log.totalTime,
      billableMinutes: log.billableTime,
      totalHours: Math.round((log.totalTime / 60) * 10) / 10,
      billableHours: Math.round((log.billableTime / 60) * 10) / 10,
      logCount: log.logCount
    }))
  };
}
