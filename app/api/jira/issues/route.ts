import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { IssueComment, TimeLog } from "@/models/IssueCollaboration";
import { AuditLog } from "@/models/AuditLog";
import { requirePermission } from "@/lib/jiraPermissions";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["create_issue"]);
    if (!authorized) return response;

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      projectId: string;
      title: string;
      description?: string;
      type: string;
      priority: "Lowest" | "Low" | "Medium" | "High" | "Highest";
      assignee?: string;
      dueDate?: string;
      estimatedHours?: number;
      labels?: string[];
      parentIssue?: string;
    };

    if (!body.projectId || !body.title || !body.type) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    // Generate key (PROJECT-1, PROJECT-2, etc.)
    const taskCount = await Task.countDocuments({ project: body.projectId });
    const key = `TSK-${taskCount + 1}`;

    const task = await Task.create({
      title: body.title,
      description: body.description,
      key,
      project: body.projectId,
      type: body.type,
      priority: body.priority || "Medium",
      assignee: body.assignee || null,
      reporter: payload.sub,
      status: "backlog",
      dueDate: body.dueDate,
      isDeleted: false,
      metadata: {
        estimatedHours: body.estimatedHours,
        labels: body.labels || [],
        watchers: [payload.sub],
        storyPoints: 0,
        parent: body.parentIssue || null
      }
    });

    // Log to audit
    await AuditLog.create({
      action: "manual_entry_create",
      user: payload.sub,
      entity: "Task",
      entityId: task._id,
      newValues: {
        title: task.title,
        priority: task.priority,
        type: task.type
      }
    });

    return NextResponse.json(
      successResp("Issue created", {
        id: task._id.toString(),
        key: task.key,
        title: task.title
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/issues/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create issue", err?.message || err),
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
    const assignee = searchParams.get("assignee");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const labels = searchParams.get("labels");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    let query: any = { isDeleted: false };

    if (projectId) query.project = projectId;
    if (assignee) query.assignee = assignee;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (labels) query["metadata.labels"] = { $in: labels.split(",") };

    const tasks = await Task.find(query)
      .populate("assignee", "firstName lastName email")
      .populate("reporter", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Task.countDocuments(query);

    return NextResponse.json(
      successResp("Issues retrieved", {
        total,
        limit,
        skip,
        issues: tasks.map((t: any) => ({
          id: t._id.toString(),
          key: t.key,
          title: t.title,
          type: t.type,
          priority: t.priority,
          status: t.status,
          assignee: t.assignee,
          dueDate: t.dueDate,
          createdAt: t.createdAt
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/issues/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve issues", err?.message || err),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["edit_issue"]);
    if (!authorized) return response;

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      issueId: string;
      status?: string;
      assignee?: string;
      priority?: string;
      dueDate?: string;
    };

    if (!body.issueId) {
      return NextResponse.json(errorResp("Missing issue ID"), { status: 400 });
    }

    const task = await Task.findById(body.issueId);
    if (!task) {
      return NextResponse.json(errorResp("Issue not found"), { status: 404 });
    }

    const oldValues = {
      status: task.status,
      assignee: task.assignee,
      priority: task.priority,
      dueDate: task.dueDate
    };

    if (body.status) task.status = body.status;
    if (body.assignee) task.assignee = new Types.ObjectId(body.assignee);
    if (body.priority) task.priority = body.priority as any;
    if (body.dueDate) task.dueDate = new Date(body.dueDate);

    await task.save();

    // Log to audit
    await AuditLog.create({
      action: "manual_entry_update",
      user: payload.sub,
      entity: "Task",
      entityId: task._id,
      oldValues,
      newValues: {
        status: task.status,
        assignee: task.assignee,
        priority: task.priority,
        dueDate: task.dueDate
      }
    });

    return NextResponse.json(
      successResp("Issue updated", { id: task._id.toString() })
    );
  } catch (err: any) {
    console.error("[jira/issues/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update issue", err?.message || err),
      { status: 500 }
    );
  }
}
