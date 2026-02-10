import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import SubTaskTemplate from "@/models/SubTaskTemplate";
import { Task } from "@/models/Task";
import { ProjectAutomation } from "@/models/ProjectAutomation";
import { Types } from "mongoose";

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
      enabled: true
    });

    for (const rule of rules) {
      // Check conditions if any
      if (rule.conditions && (rule.conditions as any[]).length > 0) {
        const task = await Task.findById(taskId);
        if (!task) continue;

        const conditions = (rule.conditions as any)[0] || (rule.conditions as any);

        // Check type filter
        if (
          conditions.taskType &&
          task.type?.toLowerCase() !== String(conditions.taskType).toLowerCase()
        ) {
          continue;
        }
      }

      // Execute actions
      for (const action of rule.actions || []) {
        const a: any = action;
        if (a.type === "create_subtasks") {
          // Auto-apply sub-task template
          if (a.config?.templateId) {
            await applySubTaskTemplate(taskId, a.config.templateId);
          }
        } else if (a.type === "auto_assign_subtasks") {
          // Auto-assign created sub-tasks
          if (a.config?.assignments) {
            await autoAssignSubTasks(taskId, a.config.assignments);
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
