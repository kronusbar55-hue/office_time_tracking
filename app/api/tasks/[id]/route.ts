import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { captureAuditLogs } from "@/lib/taskAudit";
import { TaskActivityLog } from "@/models/TaskActivityLog";
import mongoose from "mongoose";
import cloudinary from "@/lib/cloudinary";

async function getUserFromRequest() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;
  return payload;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }
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
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }
    await connectDB();
    
    const contentType = request.headers.get("content-type") || "";
    let payload: any = {};
    const attachments: any[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      // Map basic fields
      const fields = ["title", "description", "priority", "project", "assignee", "reporter", "dueDate", "status", "labels", "estimatedTime", "sprint"];
      for (const field of fields) {
        if (formData.has(field)) {
          payload[field] = formData.get(field);
        }
      }

      // Process new files
      const files = formData.getAll("attachments");
      for (const f of files) {
        if (f && typeof f === "object" && "size" in f && (f as any).size > 0) {
          const file = f as any;
          const buffer = Buffer.from(await file.arrayBuffer());
          try {
            const base64 = buffer.toString("base64");
            const dataUri = `data:${file.type};base64,${base64}`;
            const res = await cloudinary.uploader.upload(dataUri, {
              folder: `tasks/attachments`,
              resource_type: "auto",
              format: "webp",
              quality: "auto"
            });

            attachments.push({
              url: res.secure_url,
              publicId: res.public_id,
              fileName: file.name || "attachment",
              fileSize: file.size,
              mimeType: file.type || "image/jpeg",
              uploadedBy: (await getUserFromRequest())?.sub,
              uploadedAt: new Date()
            });
          } catch (e) {
            console.error("Cloudinary upload failed", e);
          }
        }
      }
    } else {
      payload = await request.json();
    }

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
      if (allowed.includes(k)) {
        // For status, ensure lowercase consistency
        if (k === "status") update[k] = String(payload[k]).toLowerCase();
        else update[k] = payload[k];
      }
    }

    // Merge new attachments if any
    if (attachments.length > 0) {
      update.attachments = [...(existing.attachments || []), ...attachments];
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await Task.findByIdAndUpdate(params.id, update, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

    // capture audit logs
    await captureAuditLogs(existing as any, updated as any, { id: user.sub, role: user.role }, { ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "", ua: request.headers.get("user-agent") || "" });

      // Create activity log
      try {
        const fieldChanges = [];
        const obsOld = existing as any;
        const obsNew = updated as any;
        for (const k of Object.keys(update)) {
          // Compare values to see if they actually changed
          const valOld = JSON.stringify(obsOld[k]);
          const valNew = JSON.stringify(obsNew[k]);
          
          if (valOld !== valNew) {
            const change: any = {
              fieldName: k,
              oldValue: obsOld[k],
              newValue: obsNew[k]
            };

            // Resolve human-readable names for ID fields
            if (k === "assignee" || k === "reporter") {
                const oldU: any = obsOld[k] ? await User.findById(obsOld[k]).select("firstName lastName").lean() : null;
                const newU: any = obsNew[k] ? await User.findById(obsNew[k]).select("firstName lastName").lean() : null;
                if (oldU) change.displayOldValue = `${oldU.firstName} ${oldU.lastName}`;
                if (newU) change.displayNewValue = `${newU.firstName} ${newU.lastName}`;
            } else if (k === "project") {
                const oldP: any = obsOld[k] ? await Project.findById(obsOld[k]).select("name").lean() : null;
                const newP: any = obsNew[k] ? await Project.findById(obsNew[k]).select("name").lean() : null;
                if (oldP) change.displayOldValue = oldP.name;
                if (newP) change.displayNewValue = newP.name;
            }

            fieldChanges.push(change);
          }
        }

      if (fieldChanges.length > 0) {
        let eventType: any = "FIELD_CHANGED";
        if (fieldChanges.some(f => f.fieldName === "status")) eventType = "STATUS_CHANGED";
        else if (fieldChanges.some(f => f.fieldName === "assignee")) eventType = "ASSIGNEE_CHANGED";
        else if (fieldChanges.some(f => f.fieldName === "priority")) eventType = "PRIORITY_CHANGED";
        else if (fieldChanges.some(f => f.fieldName === "description")) eventType = "DESCRIPTION_EDITED";
        else if (fieldChanges.some(f => f.fieldName === "dueDate")) eventType = "DUEDATE_CHANGED";

        await TaskActivityLog.create({
          task: params.id as any,
          user: user.sub,
          eventType,
          fieldChanges,
          description: `Updated ${fieldChanges.length} field(s): ${fieldChanges.map(f => f.fieldName).join(", ")}`
        });
      }
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }
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
