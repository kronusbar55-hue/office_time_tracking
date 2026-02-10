import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { TaskActivityLog } from "@/models/TaskActivityLog";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { captureAuditLogs } from "@/lib/taskAudit";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status } = await request.json();
    if (!status) return NextResponse.json({ error: "Missing status" }, { status: 400 });

    const id = params.id;
    const prev = await Task.findById(id).lean();
    if (!prev) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // workflow matrix for employees
    const allowedForEmployee: Record<string, string[]> = {
      backlog: ["todo", "in_progress"],
      todo: ["in_progress"],
      in_progress: ["in_review", "done"],
      in_review: ["done"],
      done: []
    };

    if (payload.role === "employee") {
      const from = prev.status;
      const allowed = allowedForEmployee[from] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json({ error: "Employees are not authorized to perform this status transition." }, { status: 403 });
      }
    }

    const updated = await Task.findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .populate({ path: "project", select: "name" })
      .populate({ path: "assignee", select: "firstName lastName email" })
      .populate({ path: "reporter", select: "firstName lastName email" })
      .lean();

    // create activity log
    try {
      await TaskActivityLog.create({
        task: id as any,
        user: payload.sub || null,
        action: "STATUS_CHANGED",
        from: prev.status,
        to: status
      });
    } catch (e) {
      console.error("Failed to create activity log", e);
    }

    // capture audit logs
    try {
      await captureAuditLogs(prev as any, updated as any, { id: payload.sub, role: payload.role }, { ip: request.headers.get("x-forwarded-for") || "", ua: request.headers.get("user-agent") || "" });
    } catch (e) {
      console.error("audit capture failed", e);
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
