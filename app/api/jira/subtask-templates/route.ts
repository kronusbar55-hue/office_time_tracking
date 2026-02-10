import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SubTaskTemplate from "@/models/SubTaskTemplate";
import { successResp, errorResp } from "@/lib/apiResponse";
import { Types } from "mongoose";

/**
 * Create sub-task template
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
      description?: string;
      triggeredBy?: "task_created" | "epic_created" | "story_created" | "manual";
      taskTypeFilter?: string;
      subtasks: Array<{
        title: string;
        description?: string;
        priority: string;
        estimatedMinutes?: number;
      }>;
    };

    if (!body.projectId || !body.name || !body.subtasks?.length) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    // Sort subtasks by order
    const sortedSubtasks = body.subtasks.map((st, idx) => ({
      ...st,
      order: idx
    }));

    const template = await SubTaskTemplate.create({
      project: body.projectId,
      name: body.name,
      description: body.description,
      triggeredBy: body.triggeredBy || "manual",
      taskTypeFilter: body.taskTypeFilter,
      subtasks: sortedSubtasks,
      isActive: true,
      createdBy: payload.sub
    });

    return NextResponse.json(
      successResp("Template created", {
        id: template._id.toString(),
        name: template.name,
        subtaskCount: template.subtasks.length
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/subtask-templates/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create template", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * List templates for a project
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
      filter.triggeredBy = trigger;
    }

    const templates = await SubTaskTemplate.find(filter)
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      successResp("Templates retrieved", {
        projectId,
        count: templates.length,
        templates: templates.map((t: any) => ({
          id: t._id.toString(),
          name: t.name,
          description: t.description,
          triggeredBy: t.triggeredBy,
          subtaskCount: t.subtasks?.length || 0,
          createdBy: t.createdBy
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/subtask-templates/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve templates", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Apply template to create sub-tasks
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
      templateId: string;
      parentTaskId: string;
      assignees?: { [key: number]: string }; // Map of subtask order to user ID
    };

    if (!body.templateId || !body.parentTaskId) {
      return NextResponse.json(
        errorResp("Missing templateId or parentTaskId"),
        { status: 400 }
      );
    }

    const template = await SubTaskTemplate.findById(body.templateId);
    if (!template) {
      return NextResponse.json(
        errorResp("Template not found"),
        { status: 404 }
      );
    }

    // This would normally be imported from SubTask creation logic
    // For now, return the template details for client-side sub-task creation
    return NextResponse.json(
      successResp("Template ready for application", {
        templateId: body.templateId,
        name: template.name,
        subtasks: template.subtasks,
        parentTaskId: body.parentTaskId
      })
    );
  } catch (err: any) {
    console.error("[jira/subtask-templates/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to apply template", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Delete template
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
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        errorResp("Missing templateId"),
        { status: 400 }
      );
    }

    // Soft delete by marking inactive
    const result = await SubTaskTemplate.findByIdAndUpdate(
      templateId,
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        errorResp("Template not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Template deleted", { templateId })
    );
  } catch (err: any) {
    console.error("[jira/subtask-templates/DELETE] error:", err);
    return NextResponse.json(
      errorResp("Failed to delete template", err?.message || err),
      { status: 500 }
    );
  }
}
