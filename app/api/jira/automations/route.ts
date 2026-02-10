import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProjectAutomation } from "@/models/ProjectAutomation";
import { Task } from "@/models/Task";
import { Notification } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";
import { executeAutomations } from "@/lib/automationExecutor";

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


