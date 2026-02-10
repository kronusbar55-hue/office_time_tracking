import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { TimeLog } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";

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
    const reportType = searchParams.get("type");
    const projectId = searchParams.get("projectId");
    const sprintId = searchParams.get("sprintId");

    if (reportType === "velocity" && projectId) {
      // Velocity chart - completed story points per sprint
      const sprints = await Sprint.find({
        project: projectId,
        status: "completed"
      })
        .sort({ completedAt: -1 })
        .limit(10)
        .lean();

      return NextResponse.json(
        successResp("Velocity report", {
          sprints: sprints.map((s: any) => ({
            name: s.name,
            velocity: s.velocity || 0,
            capacity: s.capacity || 0,
            issueCount: s.issues?.length || 0,
            completedAt: s.completedAt
          }))
        })
      );
    }

    if (reportType === "burndown" && sprintId) {
      // Burndown chart - tasks completed over time
      const sprint = await Sprint.findById(sprintId)
        .populate("issues")
        .lean();

      if (!sprint) {
        return NextResponse.json(errorResp("Sprint not found"), { status: 404 });
      }

      const totalTasks = (sprint.issues as any[])?.length || 0;
      const completedTasks = (sprint.issues as any[])?.filter((issue: any) => issue.status === "done").length || 0;

      return NextResponse.json(
        successResp("Burndown report", {
          sprintName: sprint.name,
          totalTasks,
          completedTasks,
          remainingTasks: totalTasks - completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        })
      );
    }

    if (reportType === "workload" && projectId) {
      // Team workload - tasks per assignee
      const tasks = await Task.find({ project: projectId, isDeleted: false })
        .populate("assignee", "firstName lastName")
        .lean();

      const workloadMap = new Map();
      tasks.forEach((task: any) => {
        const assigneeId = task.assignee?._id?.toString();
        if (assigneeId) {
          if (!workloadMap.has(assigneeId)) {
            workloadMap.set(assigneeId, {
              user: task.assignee,
              totalTasks: 0,
              highPriority: 0,
              inProgress: 0,
              done: 0
            });
          }
          const data = workloadMap.get(assigneeId);
          data.totalTasks++;
          if (task.priority === "High" || task.priority === "Highest") data.highPriority++;
          if (task.status === "in_progress") data.inProgress++;
          if (task.status === "done") data.done++;
        }
      });

      return NextResponse.json(
        successResp("Workload report", {
          workload: Array.from(workloadMap.values())
        })
      );
    }

    if (reportType === "time-tracking" && projectId) {
      // Time tracking per user
      const timeLogs = await TimeLog.find()
        .populate("issue", "key project")
        .populate("user", "firstName lastName")
        .lean();

      const projectTimeLogs = (timeLogs as any[]).filter((log: any) => log.issue?.project?.toString() === projectId);

      const timeByUser = new Map();
      projectTimeLogs.forEach((log: any) => {
        const userId = log.user?._id?.toString();
        if (userId) {
          if (!timeByUser.has(userId)) {
            timeByUser.set(userId, {
              user: log.user,
              totalMinutes: 0,
              billableMinutes: 0,
              logCount: 0
            });
          }
          const data = timeByUser.get(userId);
          data.totalMinutes += log.timeSpent || 0;
          if (log.isBillable) data.billableMinutes += log.timeSpent || 0;
          data.logCount++;
        }
      });

      return NextResponse.json(
        successResp("Time tracking report", {
          timeByUser: Array.from(timeByUser.values()).map((data: any) => ({
            user: data.user,
            totalHours: (data.totalMinutes / 60).toFixed(2),
            billableHours: (data.billableMinutes / 60).toFixed(2),
            logCount: data.logCount
          }))
        })
      );
    }

    if (reportType === "issue-breakdown" && projectId) {
      // Issue type and priority breakdown
      const tasks = await Task.find({ project: projectId, isDeleted: false }).lean();

      const typeBreakdown = new Map();
      const priorityBreakdown = new Map();
      const statusBreakdown = new Map();

      tasks.forEach((task: any) => {
        // Type breakdown
        typeBreakdown.set(task.type, (typeBreakdown.get(task.type) || 0) + 1);

        // Priority breakdown
        priorityBreakdown.set(task.priority, (priorityBreakdown.get(task.priority) || 0) + 1);

        // Status breakdown
        statusBreakdown.set(task.status, (statusBreakdown.get(task.status) || 0) + 1);
      });

      return NextResponse.json(
        successResp("Issue breakdown report", {
          byType: Object.fromEntries(typeBreakdown),
          byPriority: Object.fromEntries(priorityBreakdown),
          byStatus: Object.fromEntries(statusBreakdown),
          total: tasks.length
        })
      );
    }

    return NextResponse.json(
      errorResp("Invalid or missing report type"),
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[jira/reports/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to generate report", err?.message || err),
      { status: 500 }
    );
  }
}
