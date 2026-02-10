import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProjectAutomation } from "@/models/ProjectAutomation";
import { Task } from "@/models/Task";
import { Notification } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";

// Available automation triggers
type TriggerType = "task_created" | "status_changed" | "assigned" | "pr_merged" | "due_soon";

// Available automation actions
type ActionType = "auto_assign" | "change_status" | "notify" | "add_label" | "move_to_sprint";

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
      projectId: string;
      name: string;
      trigger: TriggerType;
      conditions?: Record<string, any>;
      actions: Array<{
        type: ActionType;
        config: Record<string, any>;
      }>;
    };

    if (!body.projectId || !body.name || !body.trigger || !body.actions?.length) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const rule = await ProjectAutomation.create({
      project: body.projectId,
      name: body.name,
      trigger: body.trigger,
      conditions: body.conditions || {},
      actions: body.actions,
      isActive: true,
      priority: 0,
      createdBy: payload.sub
    });

    return NextResponse.json(
      successResp("Automation rule created", {
        id: rule._id.toString(),
        name: rule.name,
        trigger: rule.trigger
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/automations/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create automation rule", err?.message || err),
      { status: 500 }
    );
  }
}

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
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        errorResp("Missing project ID"),
        { status: 400 }
      );
    }

    const rules = await ProjectAutomation.find({
      project: projectId
    })
      .populate("createdBy", "firstName lastName")
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      successResp("Automation rules retrieved", {
        rules: rules.map((r: any) => ({
          id: r._id.toString(),
          name: r.name,
          trigger: r.trigger,
          isActive: r.isActive,
          actionsCount: r.actions?.length || 0,
          createdBy: r.createdBy
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/automations/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve automation rules", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * EXECUTE: Internal endpoint to execute automation rules when events occur
 * Called by task creation/update endpoints
 * @trigger The event that triggered the automation
 * @issueId The affected issue
 * @projectId The project context
 * @data Additional event data (old status, new status, etc.)
 */
export async function executeAutomations(
  trigger: TriggerType,
  issueId: string,
  projectId: string,
  data: Record<string, any> = {}
) {
  try {
    await connectDB();

    // Get all active rules for this project with matching trigger
    const rules = await ProjectAutomation.find({
      project: projectId,
      trigger,
      isActive: true
    }).sort({ priority: 1 });

    const issue = await Task.findById(issueId);

    for (const rule of rules) {
      // Check if conditions match
      if (rule.conditions && Object.keys(rule.conditions).length > 0) {
        const conditionsMet = checkConditions(rule.conditions, issue, data);
        if (!conditionsMet) continue;
      }

      // Execute actions
      for (const action of rule.actions) {
        await executeAction(action, issueId, projectId, issue, data);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("[executeAutomations] error:", err);
    return { success: false, error: err?.message };
  }
}

function checkConditions(
  conditions: Record<string, any>,
  issue: any,
  data: Record<string, any>
): boolean {
  // Check status condition
  if (conditions.status && issue.status !== conditions.status) {
    return false;
  }

  // Check priority condition
  if (conditions.priority && issue.priority !== conditions.priority) {
    return false;
  }

  // Check label condition
  if (conditions.label && !issue.labels?.includes(conditions.label)) {
    return false;
  }

  // Check assignee condition
  if (conditions.mustBeUnassigned && issue.assignee) {
    return false;
  }

  return true;
}

async function executeAction(
  action: { type: ActionType; config: Record<string, any> },
  issueId: string,
  projectId: string,
  issue: any,
  data: Record<string, any>
) {
  const { type, config } = action;

  switch (type) {
    case "auto_assign":
      // Auto-assign to a user
      await Task.updateOne(
        { _id: issueId },
        { assignee: config.userId }
      );
      break;

    case "change_status":
      // Auto change status
      await Task.updateOne(
        { _id: issueId },
        { status: config.newStatus }
      );
      break;

    case "notify":
      // Create notification
      await Notification.create({
        recipient: config.userId,
        type: config.notificationType || "issue_event",
        relatedIssue: issueId,
        title: config.title || "Issue notification",
        message: config.message || `Issue ${issue.key} was updated`,
        channel: ["in_app", "email"],
        isRead: false
      });
      break;

    case "add_label":
      // Add label to issue
      if (config.label) {
        await Task.updateOne(
          { _id: issueId },
          { $addToSet: { labels: config.label } }
        );
      }
      break;

    case "move_to_sprint":
      // Move issue to sprint
      if (config.sprintId) {
        await Task.updateOne(
          { _id: issueId },
          { sprint: config.sprintId }
        );
      }
      break;
  }
}
