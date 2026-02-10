import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { captureAuditLogs } from "@/lib/taskAudit";

const EMPLOYEE_ALLOWED = ["assignee","status","timeLogs","comments","checklist"];

function validateEmployeePayload(payload: any) {
  for (const k of Object.keys(payload)) {
    if (!EMPLOYEE_ALLOWED.includes(k)) {
      return { ok: false, field: k };
    }
  }
  return { ok: true };
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payloadUser = token ? verifyAuthToken(token) : null;
    if (!payloadUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    if (payloadUser.role === "employee") {
      const validated = validateEmployeePayload(body);
      if (!validated.ok) {
        return NextResponse.json({ error: "Employees are not authorized to modify this field.", field: validated.field }, { status: 403 });
      }

      // only allow reassign to self or within team (basic: allow self)
      if (body.assignee) {
        if (body.assignee !== payloadUser.sub) {
          return NextResponse.json({ error: "Employees can only assign tasks to themselves or team members." }, { status: 403 });
        }
      }

      // Status validation: allow only permitted transitions for employee
      if (body.status) {
        // minimal workflow checks
        const allowed: Record<string,string[]> = {
          backlog: ["todo","in_progress"],
          todo: ["in_progress"],
          in_progress: ["in_review","done"],
          in_review: ["done"],
          done: []
        };
        const task = await Task.findById(params.id).lean();
        if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const from = task.status;
        const to = body.status;
        const allowedTo = allowed[from] || [];
        if (!allowedTo.includes(to)) {
          return NextResponse.json({ error: "Employees are not authorized to perform this status transition." }, { status: 403 });
        }
      }

      const existing = await Task.findById(params.id).lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // apply only whitelisted fields
      const update: any = {};
      for (const k of Object.keys(body)) update[k] = body[k];

      const updated = await Task.findByIdAndUpdate(params.id, update, { new: true }).lean();

      await captureAuditLogs(existing as any, updated as any, { id: payloadUser.sub, role: payloadUser.role }, { ip: request.headers.get("x-forwarded-for") || "", ua: request.headers.get("user-agent") || "" });

      return NextResponse.json({ data: updated });
    }

    // non-employee: forward to general update (allow full edit)
    return NextResponse.json({ error: "Use admin update endpoint" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
