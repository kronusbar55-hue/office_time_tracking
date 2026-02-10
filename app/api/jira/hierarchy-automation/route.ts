import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { executeHierarchyAutomation } from "@/lib/hierarchyAutomationExecutor";
import { ProjectAutomation } from "@/models/ProjectAutomation";
import { successResp, errorResp } from "@/lib/apiResponse";

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
      enabled: true,
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
      enabled: true
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
    if (body.isActive !== undefined) updateData.enabled = body.isActive;
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
        enabled: (rule as any).enabled
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
