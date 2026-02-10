import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import { AuditLog } from "@/models/AuditLog";
import { successResp, errorResp } from "@/lib/apiResponse";
import { Types } from "mongoose";

/**
 * Bulk operations on sub-tasks or issues
 * Supported operations: assign, status change, label update, move parent, delete
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
      issueIds: string[]; // Can be subtask IDs or task IDs
      operation: "assign" | "change_status" | "add_label" | "remove_label" | "move_parent" | "delete";
      data: {
        assignee?: string;
        status?: string;
        label?: string;
        newParentId?: string;
      };
    };

    if (!body.issueIds?.length || !body.operation) {
      return NextResponse.json(
        errorResp("Missing issueIds or operation"),
        { status: 400 }
      );
    }

    let successCount = 0;
    const errors: string[] = [];
    const results: any[] = [];

    for (const issueId of body.issueIds) {
      try {
        const issue = await SubTask.findById(issueId);

        if (!issue) {
          errors.push(`Issue ${issueId} not found`);
          continue;
        }

        let updateData: any = {};

        switch (body.operation) {
          case "assign":
            if (!body.data.assignee) {
              errors.push("assignee required for assign operation");
              continue;
            }
            updateData.assignee = new Types.ObjectId(body.data.assignee);
            break;

          case "change_status":
            if (!body.data.status) {
              errors.push("status required for change_status operation");
              continue;
            }
            updateData.status = body.data.status;
            break;

          case "add_label":
            if (!body.data.label) {
              errors.push("label required");
              continue;
            }
            if (!issue.labels?.includes(body.data.label)) {
              updateData.labels = [...(issue.labels || []), body.data.label];
            }
            break;

          case "remove_label":
            if (!body.data.label) {
              errors.push("label required");
              continue;
            }
            updateData.labels = issue.labels?.filter((l) => l !== body.data.label) || [];
            break;

          case "move_parent":
            if (!body.data.newParentId) {
              errors.push("newParentId required for move_parent operation");
              continue;
            }
            updateData.parentTask = new Types.ObjectId(body.data.newParentId);
            break;

          case "delete":
            updateData.isDeleted = true;
            break;
        }

        updateData.updatedBy = payload.sub;

        const updated = await SubTask.findByIdAndUpdate(
          issueId,
          { $set: updateData },
          { new: true }
        );

        // Create audit log
        await AuditLog.create({
          action: `subtask_bulk_${body.operation}`,
          user: payload.sub,
          entity: "SubTask",
          entityId: issueId,
          newValues: updateData,
          timestamp: new Date(),
          ipAddress: request.headers.get("x-forwarded-for") || "unknown"
        });

        successCount++;
        results.push({
          issueId,
          key: updated?.key,
          success: true
        });
      } catch (err: any) {
        errors.push(`Error processing ${issueId}: ${err.message}`);
      }
    }

    return NextResponse.json(
      successResp("Bulk operation completed", {
        operation: body.operation,
        totalRequested: body.issueIds.length,
        successful: successCount,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        results
      })
    );
  } catch (err: any) {
    console.error("[jira/bulk-operations/POST] error:", err);
    return NextResponse.json(
      errorResp("Bulk operation failed", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Get bulk operation status/history
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

    // Get recent bulk operations affecting this issue
    const auditLogs = await AuditLog.find({
      entityId: issueId,
      action: { $regex: "^subtask_bulk" }
    })
      .populate("user", "firstName lastName")
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();

    return NextResponse.json(
      successResp("Bulk operation history retrieved", {
        issueId,
        operations: auditLogs.map((log: any) => ({
          id: log._id.toString(),
          action: log.action,
          user: log.user,
          timestamp: log.timestamp,
          newValues: log.newValues
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/bulk-operations/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve bulk operations", err?.message || err),
      { status: 500 }
    );
  }
}
