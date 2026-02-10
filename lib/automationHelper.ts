/**
 * Automation Rules Helper
 * 
 * This module provides utilities for creating and managing automation rules
 * in the Jira module. Use this when building automation features.
 * 
 * @example
 * import { executeAutomations } from "@/app/api/jira/automations/route";
 * 
 * // When issue is created
 * await executeAutomations("task_created", issueId, projectId, {
 *   type: "bug",
 *   priority: "high"
 * });
 */

// ============================================================================
// TRIGGER TYPES - Events that can trigger automations
// ============================================================================

export type AutomationTrigger =
  | "task_created"      // New issue created
  | "status_changed"    // Issue status changed
  | "assigned"          // Issue assigned to someone
  | "pr_merged"         // Pull request merged
  | "due_soon";         // Due date is approaching

// ============================================================================
// ACTION TYPES - Actions that automation can execute
// ============================================================================

export type AutomationAction =
  | "auto_assign"       // Automatically assign issue to user
  | "change_status"     // Change issue status
  | "notify"            // Send notification
  | "add_label"         // Add label to issue
  | "move_to_sprint";   // Move issue to sprint

// ============================================================================
// AUTOMATION RULE STRUCTURE
// ============================================================================

export interface AutomationRuleConfig {
  projectId: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  
  // Optional conditions to match before executing
  conditions?: {
    status?: string;                    // Match specific status
    priority?: string;                  // Match specific priority
    type?: string;                      // Match specific issue type
    label?: string;                     // Must have this label
    mustBeUnassigned?: boolean;         // Must be unassigned
  };

  // Actions to execute when trigger fires and conditions match
  actions: Array<{
    type: AutomationAction;
    config: Record<string, any>;        // Action-specific config
  }>;

  isActive?: boolean;
  priority?: number;                    // Lower = execute first (0-100)
}

// ============================================================================
// ACTION CONFIGURATIONS - Specific config for each action type
// ============================================================================

export interface AutoAssignConfig {
  userId: string;                       // User to assign to
  overrideIfAssigned?: boolean;         // Override existing assignment
}

export interface ChangeStatusConfig {
  newStatus: string;                    // Status to change to
  bypassWorkflow?: boolean;             // Skip workflow checks (admin only)
}

export interface NotifyConfig {
  userId?: string;                      // Single recipient
  userIds?: string[];                   // Multiple recipients
  title: string;                        // Notification title
  message: string;                      // Notification message
  channels?: Array<"email" | "in_app" | "push" | "slack">;  // Delivery channels
  notificationType?: string;            // Custom notification type
}

export interface AddLabelConfig {
  label: string;                        // Label to add
}

export interface MoveToSprintConfig {
  sprintId: string;                     // Sprint to move to
}

// ============================================================================
// EXAMPLE AUTOMATION RULES
// ============================================================================

export const EXAMPLE_RULES = {
  /**
   * Auto-assign high priority bugs to QA team
   */
  autoAssignHighPriorityBugs: {
    name: "Auto-assign high priority bugs",
    trigger: "task_created",
    conditions: {
      type: "bug",
      priority: "high"
    },
    actions: [
      {
        type: "auto_assign",
        config: {
          userId: "qa-lead-user-id"
        }
      },
      {
        type: "notify",
        config: {
          userIds: ["qa-lead-user-id"],
          title: "High priority bug assigned",
          message: "A critical bug has been created and assigned to you",
          channels: ["email", "in_app", "push"]
        }
      }
    ]
  },

  /**
   * Auto-transition to 'In Progress' when task is assigned
   */
  transitionOnAssignment: {
    name: "Start task when assigned",
    trigger: "assigned",
    conditions: {
      status: "backlog"
    },
    actions: [
      {
        type: "change_status",
        config: {
          newStatus: "in_progress"
        }
      }
    ]
  },

  /**
   * Notify team when blocker is addressed
   */
  notifyOnBlockerResolution: {
    name: "Notify team on blocker resolution",
    trigger: "status_changed",
    conditions: {
      label: "blocker"
    },
    actions: [
      {
        type: "notify",
        config: {
          userIds: ["team-member-1", "team-member-2"],
          title: "Blocker issue resolved",
          message: "The blocking issue has been addressed",
          channels: ["in_app"]
        }
      }
    ]
  },

  /**
   * Add label and move to current sprint on PR merge
   */
  labelOnPRMerge: {
    name: "Mark issues as 'ready-for-review' on PR merge",
    trigger: "pr_merged",
    actions: [
      {
        type: "add_label",
        config: {
          label: "ready-for-review"
        }
      },
      {
        type: "change_status",
        config: {
          newStatus: "review"
        }
      }
    ]
  },

  /**
   * Alert on due date approaching
   */
  alertOnDueSoon: {
    name: "Alert team 2 days before deadline",
    trigger: "due_soon",
    actions: [
      {
        type: "notify",
        config: {
          title: "Task due soon",
          message: "This task is due in 2 days",
          channels: ["email", "in_app"]
        }
      }
    ]
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a basic auto-assign rule
 * @param projectId Project to apply rule to
 * @param name Rule name
 * @param conditions When to trigger
 * @param assigneeId Who to assign to
 */
export function createAutoAssignRule(
  projectId: string,
  name: string,
  conditions: AutomationRuleConfig["conditions"],
  assigneeId: string
): AutomationRuleConfig {
  return {
    projectId,
    name,
    trigger: "task_created",
    conditions,
    actions: [
      {
        type: "auto_assign",
        config: { userId: assigneeId }
      }
    ]
  };
}

/**
 * Create a notification rule
 * @param projectId Project to apply rule to
 * @param trigger When to trigger
 * @param recipientIds Who to notify
 * @param title Notification title
 * @param message Notification message
 */
export function createNotificationRule(
  projectId: string,
  trigger: AutomationTrigger,
  recipientIds: string[],
  title: string,
  message: string
): AutomationRuleConfig {
  return {
    projectId,
    name: `Notify on ${trigger}`,
    trigger,
    actions: [
      {
        type: "notify",
        config: {
          userIds: recipientIds,
          title,
          message,
          channels: ["email", "in_app"]
        }
      }
    ]
  };
}

/**
 * Create a workflow transition rule
 * @param projectId Project to apply rule to
 * @param trigger When to trigger
 * @param fromStatus Expected current status
 * @param toStatus Status to change to
 */
export function createTransitionRule(
  projectId: string,
  trigger: AutomationTrigger,
  fromStatus: string,
  toStatus: string
): AutomationRuleConfig {
  return {
    projectId,
    name: `Auto-transition ${fromStatus} → ${toStatus}`,
    trigger,
    conditions: { status: fromStatus },
    actions: [
      {
        type: "change_status",
        config: { newStatus: toStatus }
      }
    ]
  };
}

// ============================================================================
// RULE VALIDATION HELPERS
// ============================================================================

export function validateAutomationRule(
  rule: AutomationRuleConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!rule.projectId) errors.push("projectId is required");
  if (!rule.name) errors.push("name is required");
  if (!rule.trigger) errors.push("trigger is required");
  if (!rule.actions || rule.actions.length === 0) {
    errors.push("at least one action is required");
  }

  // Validate actions
  rule.actions?.forEach((action, idx) => {
    if (!action.type) {
      errors.push(`Action ${idx}: type is required`);
    }
    if (!action.config) {
      errors.push(`Action ${idx}: config is required`);
    }

    // Validate specific action configs
    if (action.type === "auto_assign" && !action.config.userId) {
      errors.push(`Action ${idx}: userId required for auto_assign`);
    }
    if (action.type === "change_status" && !action.config.newStatus) {
      errors.push(`Action ${idx}: newStatus required for change_status`);
    }
    if (action.type === "add_label" && !action.config.label) {
      errors.push(`Action ${idx}: label required for add_label`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// CONDITION BUILDERS - DSL for building conditions
// ============================================================================

export class ConditionBuilder {
  private conditions: AutomationRuleConfig["conditions"] = {};

  withStatus(status: string): this {
    this.conditions.status = status;
    return this;
  }

  withPriority(priority: string): this {
    this.conditions.priority = priority;
    return this;
  }

  withType(type: string): this {
    this.conditions.type = type;
    return this;
  }

  withLabel(label: string): this {
    this.conditions.label = label;
    return this;
  }

  mustBeUnassigned(): this {
    this.conditions.mustBeUnassigned = true;
    return this;
  }

  build(): AutomationRuleConfig["conditions"] {
    return this.conditions;
  }
}

export class ActionBuilder {
  private actions: AutomationRuleConfig["actions"] = [];

  autoAssign(userId: string): this {
    this.actions.push({
      type: "auto_assign",
      config: { userId }
    });
    return this;
  }

  changeStatus(newStatus: string): this {
    this.actions.push({
      type: "change_status",
      config: { newStatus }
    });
    return this;
  }

  notify(config: NotifyConfig): this {
    this.actions.push({
      type: "notify",
      config
    });
    return this;
  }

  addLabel(label: string): this {
    this.actions.push({
      type: "add_label",
      config: { label }
    });
    return this;
  }

  moveToSprint(sprintId: string): this {
    this.actions.push({
      type: "move_to_sprint",
      config: { sprintId }
    });
    return this;
  }

  build(): AutomationRuleConfig["actions"] {
    return this.actions;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Using helper functions
const rule1 = createAutoAssignRule(
  projectId,
  "Auto-assign bugs to QA",
  { type: "bug", priority: "high" },
  qaTeamLeadId
);

// Example 2: Using builders (fluent API)
const rule2: AutomationRuleConfig = {
  projectId,
  name: "Complex automation",
  trigger: "task_created",
  conditions: new ConditionBuilder()
    .withType("bug")
    .withPriority("critical")
    .build(),
  actions: new ActionBuilder()
    .autoAssign(qaTeamLeadId)
    .addLabel("urgent")
    .notify({
      userIds: [qaTeamLeadId, otherQA],
      title: "Critical bug created",
      message: "You have a critical bug to handle",
      channels: ["email", "in_app", "push"]
    })
    .build()
};

// Example 3: Validating before submission
const validation = validateAutomationRule(rule2);
if (!validation.valid) {
  console.error("Rule validation failed:", validation.errors);
}

// Example 4: Executing automations when events occur
import { executeAutomations } from "@/app/api/jira/automations/route";

// When someone creates a new issue
await executeAutomations("task_created", issueId, projectId, {
  type: "bug",
  priority: "high"
});

// When issue status changes
await executeAutomations("status_changed", issueId, projectId, {
  oldStatus: "backlog",
  newStatus: "in_progress"
});

// When issue is assigned
await executeAutomations("assigned", issueId, projectId, {
  assignedTo: userId
});
*/

export default {
  EXAMPLE_RULES,
  createAutoAssignRule,
  createNotificationRule,
  createTransitionRule,
  validateAutomationRule,
  ConditionBuilder,
  ActionBuilder
};
