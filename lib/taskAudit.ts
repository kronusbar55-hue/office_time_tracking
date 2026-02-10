import { Task } from "@/models/Task";
import { TaskAuditLog } from "@/models/TaskAuditLog";
import type { ITask } from "@/models/Task";

type UserInfo = { id?: string; role?: string };

export async function captureAuditLogs(oldDoc: Partial<ITask> | null, newDoc: Partial<ITask>, user: UserInfo = {}, ctx: { ip?: string; ua?: string } = {}) {
  try {
    if (!oldDoc) {
      // creation
      await TaskAuditLog.create({
        taskId: (newDoc as any)._id,
        actionType: "TASK_CREATED",
        oldValue: null,
        newValue: newDoc,
        changedBy: user.id,
        changedByRole: user.role,
        ipAddress: ctx.ip,
        userAgent: ctx.ua
      });
      return;
    }

    const keys = new Set<string>([...Object.keys(oldDoc as any), ...Object.keys(newDoc as any)]);

    for (const k of keys) {
      const oldVal = (oldDoc as any)[k];
      const newVal = (newDoc as any)[k];
      // ignore mongoose metadata
      if (k === "updatedAt" || k === "createdAt" || k === "__v") continue;
      const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
      if (changed) {
        // Map some fields to action types
        let actionType = "FIELD_UPDATED";
        if (k === "status") actionType = "STATUS_CHANGED";
        if (k === "assignee") actionType = "ASSIGNEE_CHANGED";
        if (k === "priority") actionType = "PRIORITY_CHANGED";
        if (k === "description") actionType = "DESCRIPTION_EDITED";
        if (k === "attachments") actionType = "ATTACHMENT_CHANGED";

        await TaskAuditLog.create({
          taskId: (newDoc as any)._id || (oldDoc as any)._id,
          actionType,
          fieldName: k,
          oldValue: oldVal,
          newValue: newVal,
          changedBy: user.id,
          changedByRole: user.role,
          ipAddress: ctx.ip,
          userAgent: ctx.ua
        });
      }
    }
  } catch (e) {
    console.error("captureAuditLogs error", e);
  }
}
