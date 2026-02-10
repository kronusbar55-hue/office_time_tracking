import { connectDB } from "@/lib/db";
import {
  ProjectAutomation,
  type AutomationTrigger,
  type AutomationAction
} from "@/models/ProjectAutomation";
import { Task } from "@/models/Task";
import { Notification } from "@/models/IssueCollaboration";

/**
 * Execute automation rules when events occur
 * Called by task creation/update endpoints
 * @trigger The event that triggered the automation
 * @issueId The affected issue
 * @projectId The project context
 * @data Additional event data (old status, new status, etc.)
 */
export async function executeAutomations(
  trigger: AutomationTrigger,
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
  action: { action: AutomationAction; params: Record<string, any> },
  issueId: string,
  projectId: string,
  issue: any,
  data: Record<string, any>
) {
  const type = action.action;
  const config = action.params || {};

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

    case "notify_user":
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
