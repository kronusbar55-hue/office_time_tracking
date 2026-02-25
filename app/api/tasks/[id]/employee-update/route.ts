import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { captureAuditLogs } from "@/lib/taskAudit";
import { TaskActivityLog } from "@/models/TaskActivityLog";

const EMPLOYEE_ALLOWED = ["assignee", "status", "timeLogs", "comments", "checklist"];

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

      const existing = await Task.findById(params.id).lean();
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // apply only whitelisted fields
      const update: any = {};
      for (const k of Object.keys(body)) update[k] = body[k];

      const updated = await Task.findByIdAndUpdate(params.id, update, { new: true }).lean();
      if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

      await captureAuditLogs(existing as any, updated as any, { id: payloadUser.sub, role: payloadUser.role }, { ip: request.headers.get("x-forwarded-for") || "", ua: request.headers.get("user-agent") || "" });

      // Create activity log
      try {
        const fieldChanges = [];
        const obsOld = existing as any;
        const obsNew = updated as any;
        for (const k of Object.keys(update)) {
          if (JSON.stringify(obsOld[k]) !== JSON.stringify(obsNew[k])) {
            fieldChanges.push({
              fieldName: k,
              oldValue: obsOld[k],
              newValue: obsNew[k]
            });
          }
        }

        if (fieldChanges.length > 0) {
          let eventType: any = "FIELD_CHANGED";
          if (fieldChanges.some(f => f.fieldName === "status")) eventType = "STATUS_CHANGED";
          else if (fieldChanges.some(f => f.fieldName === "assignee")) eventType = "ASSIGNEE_CHANGED";

          await TaskActivityLog.create({
            task: params.id as any,
            user: payloadUser.sub,
            eventType,
            fieldChanges,
            description: `Employee updated ${fieldChanges.length} field(s): ${fieldChanges.map(f => f.fieldName).join(", ")}`
          });
        }
      } catch (e) {
        console.error("Failed to create activity log:", e);
      }

      return NextResponse.json({ data: updated });
    }

    // non-employee: forward to general update (allow full edit)
    return NextResponse.json({ error: "Use admin update endpoint" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
