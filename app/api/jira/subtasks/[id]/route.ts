import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import IssueHierarchy from "@/models/IssueHierarchy";
import { AuditLog } from "@/models/AuditLog";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * Get single sub-task with all details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const subTask = await SubTask.findById(params.id)
      .populate("assignee", "firstName lastName email")
      .populate("reporter", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .populate("updatedBy", "firstName lastName")
      .populate("watchers", "firstName lastName email")
      .lean();

    // When using `.lean()`, `subTask` is either `null` or a plain object.
    // Narrow the type before checking soft-delete flag to satisfy TypeScript.
    if (!subTask || (subTask as any).isDeleted) {
      return NextResponse.json(
        errorResp("Sub-task not found"),
        { status: 404 }
      );
    }

    // Get parent task info
    const parentTaskId = (subTask as any).parentTask;
    const parentTask = await SubTask.findOne({ _id: parentTaskId })
      .select("key title")
      .lean();

    return NextResponse.json(
      successResp("Sub-task retrieved", {
        id: (subTask as any)._id.toString(),
        key: (subTask as any).key,
        title: (subTask as any).title,
        description: (subTask as any).description,
        parentTask: parentTaskId
          ? {
              id: parentTaskId.toString(),
              key: (parentTask as any)?.key
            }
          : null,
        status: (subTask as any).status,
        priority: (subTask as any).priority,
        assignee: (subTask as any).assignee,
        reporter: (subTask as any).reporter,
        dueDate: (subTask as any).dueDate,
        estimatedTime: (subTask as any).estimatedTime,
        loggedTime: (subTask as any).loggedTime,
        loggedHours: (subTask as any).loggedHours,
        progressPercent: (subTask as any).progressPercent,
        labels: (subTask as any).labels,
        watchers: (subTask as any).watchers,
        attachments: (subTask as any).attachments,
        createdAt: (subTask as any).createdAt,
        updatedAt: (subTask as any).updatedAt
      })
    );
  } catch (err: any) {
    console.error("[jira/subtasks/[id]/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve sub-task", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Update sub-task fields
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      dueDate?: string;
      estimatedTime?: number;
      loggedTime?: number;
      labels?: string[];
    };

    // Find old values for audit
    const oldSubTask = await SubTask.findById(params.id);
    if (!oldSubTask || oldSubTask.isDeleted) {
      return NextResponse.json(
        errorResp("Sub-task not found"),
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updatedBy: payload.sub
    };

    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status) updateData.status = body.status;
    if (body.priority) updateData.priority = body.priority;
    if (body.assignee) updateData.assignee = body.assignee;
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime;
    if (body.loggedTime !== undefined) {
      updateData.loggedTime = body.loggedTime;
      updateData.loggedHours = Math.round((body.loggedTime / 60) * 10) / 10;
    }
    if (body.labels) updateData.labels = body.labels;

    const updatedSubTask = await SubTask.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    );

    // Create audit log
    await AuditLog.create({
      action: "subtask_updated",
      user: payload.sub,
      affectedUser: oldSubTask.assignee,
      entity: "SubTask",
      entityId: params.id,
      oldValues: {
        title: oldSubTask.title,
        status: oldSubTask.status,
        priority: oldSubTask.priority,
        assignee: oldSubTask.assignee
      },
      newValues: updateData,
      timestamp: new Date(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown"
    });

    // If status changed to "done", update parent completion
    if (body.status === "done" && oldSubTask.status !== "done") {
      await updateParentCompletion(oldSubTask.parentTask);
    }

    return NextResponse.json(
      successResp("Sub-task updated", {
        id: updatedSubTask._id.toString(),
        key: updatedSubTask.key,
        status: updatedSubTask.status
      })
    );
  } catch (err: any) {
    console.error("[jira/subtasks/[id]/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update sub-task", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Delete sub-task (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const subTask = await SubTask.findById(params.id);
    if (!subTask || subTask.isDeleted) {
      return NextResponse.json(
        errorResp("Sub-task not found"),
        { status: 404 }
      );
    }

    // Soft delete
    const parentTask = subTask.parentTask;
    await SubTask.findByIdAndUpdate(
      params.id,
      { $set: { isDeleted: true, updatedBy: payload.sub } },
      { new: true }
    );

    // Remove from hierarchy
    await IssueHierarchy.deleteOne({ issue: params.id });

    // Create audit log
    await AuditLog.create({
      action: "subtask_deleted",
      user: payload.sub,
      entity: "SubTask",
      entityId: params.id,
      oldValues: { key: subTask.key, title: subTask.title },
      timestamp: new Date(),
      ipAddress: request.headers.get("x-forwarded-for") || "unknown"
    });

    // Update parent completion
    await updateParentCompletion(parentTask);

    return NextResponse.json(
      successResp("Sub-task deleted", { id: params.id })
    );
  } catch (err: any) {
    console.error("[jira/subtasks/[id]/DELETE] error:", err);
    return NextResponse.json(
      errorResp("Failed to delete sub-task", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Helper: Recalculate parent task completion percentage
 */
async function updateParentCompletion(parentTaskId: any) {
  try {
    const total = await SubTask.countDocuments({
      parentTask: parentTaskId,
      isDeleted: false
    });

    const completed = await SubTask.countDocuments({
      parentTask: parentTaskId,
      status: "done",
      isDeleted: false
    });

    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Update parent task
    await SubTask.findByIdAndUpdate(
      parentTaskId,
      { progressPercent }
    );

    // Update hierarchy
    await IssueHierarchy.findOneAndUpdate(
      { issue: parentTaskId },
      {
        totalSubTasks: total,
        completedSubTasks: completed,
        progressPercent
      }
    );
  } catch (err) {
    console.error("[updateParentCompletion] error:", err);
  }
}
