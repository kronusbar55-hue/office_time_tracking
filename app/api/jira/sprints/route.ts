import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { requirePermission } from "@/lib/jiraPermissions";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["create_sprint"]);
    if (!authorized) return response;
    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      projectId: string;
      name: string;
      goal?: string;
      startDate?: string;
      endDate?: string;
      capacity?: number;
    };

    if (!body.projectId || !body.name) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const sprint = await Sprint.create({
      project: body.projectId,
      name: body.name,
      goal: body.goal,
      status: "planning",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      capacity: body.capacity || 0,
      velocity: 0,
      issues: [],
      createdBy: payload.sub
    });

    return NextResponse.json(
      successResp("Sprint created", {
        id: sprint._id.toString(),
        name: sprint.name
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/sprints/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create sprint", err?.message || err),
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
    const status = searchParams.get("status");

    let query: any = {};
    if (projectId) query.project = projectId;
    if (status) query.status = status;

    const sprints = await Sprint.find(query)
      .populate("issues", "key title status priority")
      .sort({ startDate: -1 })
      .lean();

    return NextResponse.json(
      successResp("Sprints retrieved", {
        sprints: sprints.map((s: any) => ({
          id: s._id.toString(),
          name: s.name,
          status: s.status,
          goal: s.goal,
          capacity: s.capacity,
          velocity: s.velocity,
          issueCount: s.issues?.length || 0,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/sprints/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve sprints", err?.message || err),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["manage_sprint"]);
    if (!authorized) return response;
    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      sprintId: string;
      action: "start" | "complete" | "add_issue" | "remove_issue" | "update";
      issueId?: string;
      updates?: Record<string, any>;
    };

    if (!body.sprintId || !body.action) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const sprint = await Sprint.findById(body.sprintId);
    if (!sprint) {
      return NextResponse.json(errorResp("Sprint not found"), { status: 404 });
    }

    if (body.action === "start") {
      sprint.status = "active";
      sprint.startDate = new Date();
    } else if (body.action === "complete") {
      sprint.status = "completed";
      sprint.completedAt = new Date();
    } else if (body.action === "add_issue" && body.issueId) {
      if (!sprint.issues.includes(body.issueId as any)) {
        sprint.issues.push(body.issueId as any);
      }
    } else if (body.action === "remove_issue" && body.issueId) {
      sprint.issues = sprint.issues.filter((id) => id.toString() !== body.issueId);
    } else if (body.action === "update" && body.updates) {
      Object.assign(sprint, body.updates);
    }

    await sprint.save();

    return NextResponse.json(
      successResp(`Sprint ${body.action}d`, { id: sprint._id.toString() })
    );
  } catch (err: any) {
    console.error("[jira/sprints/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update sprint", err?.message || err),
      { status: 500 }
    );
  }
}
