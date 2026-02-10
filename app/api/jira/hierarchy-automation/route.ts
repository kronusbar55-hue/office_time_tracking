import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import SubTaskTemplate from "@/models/SubTaskTemplate";
import { Task } from "@/models/Task";
import { ProjectAutomation } from "@/models/ProjectAutomation";
import { successResp, errorResp } from "@/lib/apiResponse";
import { Types } from "mongoose";

export interface HierarchyAutomationTrigger {
  trigger: "task_created" | "subtask_status_changed" | "all_subtasks_done";
  condition?: {
    taskType?: string;
    priority?: string;
    projectId?: string;
  };
  action: {
    type: "create_subtasks" | "auto_assign_subtasks" | "close_parent" | "notify";
    templateId?: string; // For create_subtasks
    assignmentRule?: {
      byRole?: string;
      byUser?: string;
    };
    notifyUsers?: string[];
  };
}

/**
 * Execute hierarchy automation when a task is created or status changes
 * This is called internally by other APIs
 */
export async function executeHierarchyAutomation(
  trigger: "task_created" | "subtask_status_changed" | "all_subtasks_done",
  taskId: string,
  projectId: string
) {
  try {
    await connectDB();

    // Get automation rules for this trigger
    const rules = await ProjectAutomation.find({
      project: projectId,
      trigger: trigger as any,
      isActive: true
    });

    for (const rule of rules) {
      // Check conditions if any
      if (rule.conditions && Object.keys(rule.conditions).length > 0) {
        const task = await Task.findById(taskId);
        if (!task) continue;

        // Check type filter
        if (
          rule.conditions.taskType &&
          task.type?.toLowerCase() !== rule.conditions.taskType.toLowerCase()
        ) {
          continue;
        }
      }

      // Execute actions
      for (const action of rule.actions || []) {
        if (action.type === "create_subtasks") {
          // Auto-apply sub-task template
          if (action.config?.templateId) {
            await applySubTaskTemplate(taskId, action.config.templateId);
          }
        } else if (action.type === "auto_assign_subtasks") {
          // Auto-assign created sub-tasks
          if (action.config?.assignments) {
            await autoAssignSubTasks(taskId, action.config.assignments);
          }
        }
      }
    }
  } catch (err) {
    console.error("[executeHierarchyAutomation] error:", err);
  }
}

/**
 * Apply template to create sub-tasks
 */
async function applySubTaskTemplate(parentTaskId: string, templateId: string) {
  try {
    const template = await SubTaskTemplate.findById(templateId);
    if (!template) return;

    const parentTask = await Task.findById(parentTaskId);
    if (!parentTask) return;

    // Create sub-tasks from template
    for (const templateSubtask of template.subtasks || []) {
      const count = await SubTask.countDocuments({ parentTask: parentTaskId });
      const subTaskKey = `${parentTask.key}-${count + 1}`;

      await SubTask.create({
        key: subTaskKey,
        title: templateSubtask.title,
        description: templateSubtask.description,
        parentTask: parentTaskId,
        parentIssueType: parentTask.type?.toLowerCase() || "task",
        reporter: parentTask.createdBy,
        priority: templateSubtask.priority,
        estimatedTime: templateSubtask.estimatedMinutes,
        status: "todo",
        progressPercent: 0
      });
    }
  } catch (err) {
    console.error("[applySubTaskTemplate] error:", err);
  }
}

/**
 * Auto-assign sub-tasks based on rules
 */
async function autoAssignSubTasks(
  parentTaskId: string,
  assignments: { [key: number]: string }
) {
  try {
    const subTasks = await SubTask.find({
      parentTask: parentTaskId,
      assignee: null
    }).sort({ key: 1 });

    for (const subTask of subTasks) {
      // Find assignment rule for this order
      const assigneeId = assignments[subTask.key];
      if (assigneeId) {
        await SubTask.findByIdAndUpdate(
          subTask._id,
          { assignee: new Types.ObjectId(assigneeId) }
        );
      }
    }
  } catch (err) {
    console.error("[autoAssignSubTasks] error:", err);
  }
}

/**
 * Create or update hierarchy automation rule
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
      projectId: string;
      name: string;
      trigger: "task_created" | "subtask_status_changed" | "all_subtasks_done";
      templateId?: string;
      autoAssignRules?: { [key: number]: string };
      taskTypeFilter?: string;
      description?: string;
    };

    if (!body.projectId || !body.name || !body.trigger) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    // Create or update automation rule
    const actions = [];

    if (body.templateId) {
      actions.push({
        type: "create_subtasks",
        config: { templateId: body.templateId }
      });
    }

    if (body.autoAssignRules) {
      actions.push({
        type: "auto_assign_subtasks",
        config: { assignments: body.autoAssignRules }
      });
    }

    const conditions: any = {};
    if (body.taskTypeFilter) {
      conditions.taskType = body.taskTypeFilter;
    }

    const rule = await ProjectAutomation.create({
      project: body.projectId,
      name: body.name,
      description: body.description,
      trigger: body.trigger,
      conditions,
      actions,
      isActive: true,
      priority: 0,
      createdBy: payload.sub
    });

    return NextResponse.json(
      successResp("Hierarchy automation rule created", {
        id: rule._id.toString(),
        name: rule.name,
        trigger: rule.trigger
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/hierarchy-automation/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create automation rule", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * List hierarchy automation rules for project
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
    const projectId = searchParams.get("projectId");
    const trigger = searchParams.get("trigger");

    if (!projectId) {
      return NextResponse.json(
        errorResp("Missing projectId"),
        { status: 400 }
      );
    }

    const filter: any = {
      project: projectId,
      isActive: true
    };

    if (trigger) {
      filter.trigger = trigger;
    }

    const rules = await ProjectAutomation.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return NextResponse.json(
      successResp("Automation rules retrieved", {
        projectId,
        count: rules.length,
        rules: rules.map((r: any) => ({
          id: r._id.toString(),
          name: r.name,
          trigger: r.trigger,
          actionCount: r.actions?.length || 0,
          createdBy: r.createdBy
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/hierarchy-automation/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve rules", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Update automation rule
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      ruleId: string;
      isActive?: boolean;
      name?: string;
    };

    if (!body.ruleId) {
      return NextResponse.json(
        errorResp("Missing ruleId"),
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.name) updateData.name = body.name;

    const rule = await ProjectAutomation.findByIdAndUpdate(
      body.ruleId,
      updateData,
      { new: true }
    );

    if (!rule) {
      return NextResponse.json(
        errorResp("Rule not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Rule updated", {
        id: rule._id.toString(),
        isActive: rule.isActive
      })
    );
  } catch (err: any) {
    console.error("[jira/hierarchy-automation/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update rule", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Delete automation rule
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get("ruleId");

    if (!ruleId) {
      return NextResponse.json(
        errorResp("Missing ruleId"),
        { status: 400 }
      );
    }

    const result = await ProjectAutomation.findByIdAndDelete(ruleId);

    if (!result) {
      return NextResponse.json(
        errorResp("Rule not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Rule deleted", { ruleId })
    );
  } catch (err: any) {
    console.error("[jira/hierarchy-automation/DELETE] error:", err);
    return NextResponse.json(
      errorResp("Failed to delete rule", err?.message || err),
      { status: 500 }
    );
  }
}
