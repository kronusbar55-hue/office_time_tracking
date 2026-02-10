import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import { Task } from "@/models/Task";
import IssueHierarchy from "@/models/IssueHierarchy";
import { Notification } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * Calculate and update hierarchy completion percentages
 * Auto-closes parent issues when all children are done
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      action: "recalculate" | "auto_close_parents" | "rollup_progress";
      issueId?: string;
      projectId?: string;
    };

    if (!body.action) {
      return NextResponse.json(
        errorResp("Missing action"),
        { status: 400 }
      );
    }

    let result = { updated: 0 };

    switch (body.action) {
      case "recalculate":
        if (!body.issueId) {
          return NextResponse.json(
            errorResp("Missing issueId"),
            { status: 400 }
          );
        }
        result = await recalculateHierarchy(body.issueId, payload.sub);
        break;

      case "auto_close_parents":
        if (!body.projectId && !body.issueId) {
          return NextResponse.json(
            errorResp("Missing projectId or issueId"),
            { status: 400 }
          );
        }
        result = await autoCloseParents(body.issueId || body.projectId, payload.sub);
        break;

      case "rollup_progress":
        if (!body.issueId) {
          return NextResponse.json(
            errorResp("Missing issueId"),
            { status: 400 }
          );
        }
        result = await rollupProgress(body.issueId);
        break;

      default:
        return NextResponse.json(
          errorResp(`Unknown action: ${body.action}`),
          { status: 400 }
        );
    }

    return NextResponse.json(
      successResp(`${body.action} completed`, result)
    );
  } catch (err: any) {
    console.error("[jira/hierarchy/POST] error:", err);
    return NextResponse.json(
      errorResp("Hierarchy operation failed", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Get hierarchy structure for an issue (full tree)
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
    const issueId = searchParams.get("issueId");

    if (!issueId) {
      return NextResponse.json(
        errorResp("Missing issueId"),
        { status: 400 }
      );
    }

    const issue = await Task.findById(issueId).lean();
    if (!issue) {
      return NextResponse.json(
        errorResp("Issue not found"),
        { status: 404 }
      );
    }

    // Build hierarchy tree
    const hierarchy = await buildHierarchyTree(issueId);

    return NextResponse.json(
      successResp("Hierarchy retrieved", {
        issueId,
        root: hierarchy
      })
    );
  } catch (err: any) {
    console.error("[jira/hierarchy/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve hierarchy", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Helper: Recalculate completion for an issue and propagate up
 */
async function recalculateHierarchy(issueId: string, userId: string) {
  let updated = 0;

  // Get all sub-tasks
  const subTasks = await SubTask.find({
    parentTask: issueId,
    isDeleted: false
  });

  const total = subTasks.length;
  const completed = subTasks.filter((st) => st.status === "done").length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Update parent issue
  await Task.findByIdAndUpdate(
    issueId,
    {
      progressPercent,
      childTasks: total
    }
  );

  // Update hierarchy record
  await IssueHierarchy.findOneAndUpdate(
    { issue: issueId },
    {
      totalSubTasks: total,
      completedSubTasks: completed,
      progressPercent
    }
  );

  updated++;

  // Recursively update parent
  const issue = await Task.findById(issueId);
  if (issue?.parentTask) {
    updated += (await recalculateHierarchy(issue.parentTask.toString(), userId)).updated;
  }

  return { updated };
}

/**
 * Helper: Auto-close parent issues when all sub-tasks are done
 */
async function autoCloseParents(issueId: string, userId: string) {
  let updated = 0;

  // Get parent issue
  const parentTask = await Task.findById(issueId);
  if (!parentTask) return { updated };

  // Check if all sub-tasks are done
  const incompleteTasks = await SubTask.countDocuments({
    parentTask: issueId,
    status: { $ne: "done" },
    isDeleted: false
  });

  if (incompleteTasks === 0) {
    // All sub-tasks are done - auto-close parent
    const updated_issue = await Task.findByIdAndUpdate(
      issueId,
      {
        status: "done",
        progressPercent: 100,
        updatedBy: userId
      },
      { new: true }
    );

    // Notify watchers
    if (parentTask.watchers?.length > 0) {
      for (const watcher of parentTask.watchers) {
        await Notification.create({
          recipient: watcher,
          type: "parent_completed",
          title: `Issue completed: ${parentTask.key}`,
          message: `All sub-tasks for ${parentTask.key} are now complete`,
          relatedIssue: issueId,
          channel: ["in_app", "email"]
        });
      }
    }

    updated++;

    // Recursively check parent's parent
    if (updated_issue.parentTask) {
      const parentUpdated = await autoCloseParents(
        updated_issue.parentTask.toString(),
        userId
      );
      updated += parentUpdated.updated;
    }
  }

  return { updated };
}

/**
 * Helper: Rollup progress from children to parent
 */
async function rollupProgress(issueId: string) {
  const issue = await Task.findById(issueId);
  if (!issue) return { updated: 0 };

  const subTasks = await SubTask.find({
    parentTask: issueId,
    isDeleted: false
  });

  const total = subTasks.length;
  const completed = subTasks.filter((st) => st.status === "done").length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  await Task.findByIdAndUpdate(issueId, { progressPercent });

  return { updated: 1, progressPercent };
}

/**
 * Helper: Build complete hierarchy tree
 */
async function buildHierarchyTree(issueId: string): Promise<any> {
  const issue = await Task.findById(issueId)
    .populate("assignee", "firstName lastName")
    .lean();

  if (!issue) return null;

  // Get sub-tasks
  const subTasks = await SubTask.find({
    parentTask: issueId,
    isDeleted: false
  })
    .populate("assignee", "firstName lastName")
    .lean();

  return {
    id: issue._id.toString(),
    key: issue.key || "UNKNOWN",
    title: issue.title || issue.summary,
    type: issue.type,
    status: issue.status,
    progressPercent: issue.progressPercent || 0,
    childCount: subTasks.length,
    children: subTasks.map((st: any) => ({
      id: st._id.toString(),
      key: st.key,
      title: st.title,
      status: st.status,
      assignee: st.assignee,
      progressPercent: st.progressPercent || 0
    }))
  };
}
