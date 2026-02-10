import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Workflow, Status, IssueType } from "@/models/IssueWorkflow";
import { requirePermission } from "@/lib/jiraPermissions";
import { successResp, errorResp } from "@/lib/apiResponse";

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

    let query: any = {};
    if (projectId) query.project = projectId;

    const workflows = await Workflow.find(query)
      .populate("statuses", "name color category")
      .sort({ isDefault: -1 })
      .lean();

    return NextResponse.json(
      successResp("Workflows retrieved", {
        workflows: workflows.map((w: any) => ({
          id: w._id.toString(),
          name: w.name,
          isDefault: w.isDefault,
          statuses: w.statuses,
          transitionCount: w.transitions?.length || 0
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/workflows/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve workflows", err?.message || err),
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["manage_workflow"]);
    if (!authorized) return response;

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      projectId: string;
      name: string;
      description?: string;
      statusIds: string[];
      transitions: any[];
    };

    if (!body.projectId || !body.name || !body.statusIds) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const workflow = await Workflow.create({
      project: body.projectId,
      name: body.name,
      description: body.description,
      statuses: body.statusIds,
      transitions: body.transitions || [],
      isDefault: false
    });

    return NextResponse.json(
      successResp("Workflow created", {
        id: workflow._id.toString(),
        name: workflow.name
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/workflows/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create workflow", err?.message || err),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["manage_workflow"]);
    if (!authorized) return response;

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      workflowId: string;
      transitions?: any[];
      name?: string;
      description?: string;
    };

    if (!body.workflowId) {
      return NextResponse.json(errorResp("Missing workflow ID"), { status: 400 });
    }

    const workflow = await Workflow.findById(body.workflowId);
    if (!workflow) {
      return NextResponse.json(errorResp("Workflow not found"), { status: 404 });
    }

    if (body.transitions) workflow.transitions = body.transitions;
    if (body.name) workflow.name = body.name;
    if (body.description) workflow.description = body.description;

    await workflow.save();

    return NextResponse.json(
      successResp("Workflow updated", { id: workflow._id.toString() })
    );
  } catch (err: any) {
    console.error("[jira/workflows/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update workflow", err?.message || err),
      { status: 500 }
    );
  }
}
