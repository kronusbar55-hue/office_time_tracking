import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { captureAuditLogs } from "@/lib/taskAudit";

async function getUserFromRequest() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;
  return payload;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const task = await Task.findById(params.id)
      .populate({ path: "project", select: "name" })
      .populate({ path: "assignee", select: "firstName lastName email" })
      .populate({ path: "reporter", select: "firstName lastName email" })
      .lean();
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: task });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const payload = await request.json();

    const user = await getUserFromRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await Task.findById(params.id).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Role-based allowed fields
    let allowed: string[] = [];
    if (user.role === "admin" || user.role === "manager") {
      // Full edit for admin/manager
      allowed = [
        "title",
        "description",
        "priority",
        "project",
        "assignee",
        "reporter",
        "dueDate",
        "status",
        "labels",
        "estimatedTime",
        "sprint",
        "attachments"
      ];
    } else if (user.role === "employee") {
      // Limited edit for employees (only status and assignee)
      allowed = ["status", "assignee"];
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const update: any = {};
    for (const k of Object.keys(payload)) {
      if (allowed.includes(k)) update[k] = payload[k];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await Task.findByIdAndUpdate(params.id, update, { new: true }).lean();
    // capture audit logs
    await captureAuditLogs(existing as any, updated as any, { id: user.sub, role: user.role }, { ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "", ua: request.headers.get("user-agent") || "" });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const user = await getUserFromRequest();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // allowed roles
    const allowed = ["admin", "manager", "lead", "team_lead"];
    if (!allowed.includes(user.role)) return NextResponse.json({ error: "You do not have permission to delete tasks." }, { status: 403 });

    const existing = await Task.findById(params.id).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // soft delete
    await Task.findByIdAndUpdate(params.id, { isDeleted: true });

    await captureAuditLogs(existing as any, { ...existing, isDeleted: true } as any, { id: user.sub, role: user.role }, { ip: request.headers.get("x-forwarded-for") || "", ua: request.headers.get("user-agent") || "" });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
