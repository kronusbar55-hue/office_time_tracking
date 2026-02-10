import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveAttachment } from "@/models/LeaveAttachment";
import { LeaveType } from "@/models/LeaveType";
import { LeaveBalance } from "@/models/LeaveBalance";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { successResp, errorResp } from "@/lib/apiResponse";
import cloudinary from "@/lib/cloudinary";
import mongoose from "mongoose";

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });

    await connectDB();

    const contentType = request.headers.get("content-type") || "";
    let fields: any = {};
    const attachments: Array<{ url: string; filename?: string; mimeType?: string; publicId?: string; size?: number }> = [];

    if (contentType.includes("multipart/form-data")) {
      const fd = await request.formData();
      fields.leaveType = String(fd.get("leaveType") || "");
      fields.startDate = String(fd.get("startDate") || "");
      fields.endDate = String(fd.get("endDate") || "");
      fields.duration = String(fd.get("duration") || "full-day");
      fields.reason = String(fd.get("reason") || "");

      const files = fd.getAll("attachments");
      for (const f of files) {
        if (f && f instanceof File && f.size > 0) {
          const buffer = Buffer.from(await f.arrayBuffer());
          // upload to Cloudinary
          try {
            const base64 = buffer.toString('base64');
            const dataUri = `data:${f.type};base64,${base64}`;
            const res = await cloudinary.uploader.upload(dataUri, {
              folder: 'leaves/attachments',
              resource_type: 'auto'
            });
            attachments.push({ url: res.secure_url, filename: f.name, mimeType: f.type, publicId: res.public_id, size: res.bytes });
          } catch (e) {
            console.warn('Cloudinary upload failed, falling back to local save', e);
            // fallback to local storage (best-effort)
            const ext = f.name.split('.').pop() || 'dat';
            const fileName = `${crypto.randomUUID()}.${ext}`;
            const { writeFile, mkdir } = await import('fs/promises');
            const path = (await import('path')).default;
            const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'leave');
            await mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, fileName);
            await writeFile(filePath, buffer);
            attachments.push({ url: `/uploads/leave/${fileName}`, filename: f.name, mimeType: f.type });
          }
        }
      }
    } else {
      fields = await request.json();
    }

    const userId = new mongoose.Types.ObjectId(payload.sub);
    console.log("[leaves/apply] userId:", userId);
    const { leaveType: leaveTypeInput, startDate, endDate, duration, reason } = fields;

    if (!leaveTypeInput || !startDate || !endDate || !reason) {
      console.warn("[leaves/apply] missing fields", { leaveTypeInput, startDate, endDate, reason });
      return NextResponse.json(errorResp("Missing required fields"), { status: 400 });
    }

    console.log("[leaves/apply] payload", { leaveTypeInput, startDate, endDate, duration, reason, attachmentsCount: attachments.length });

    // basic validation: no weekends
    const s = new Date(startDate + "T00:00:00");
    const e = new Date(endDate + "T00:00:00");
    if (s > e) return NextResponse.json(errorResp("Start date must be before end date"), { status: 400 });

    // disallow weekend-only days
    // For simplicity, reject if any selected day is weekend
    for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
      const day = dt.getDay();
      if (day === 0 || day === 6) {
        return NextResponse.json({ error: "Cannot apply leave on weekends" }, { status: 400 });
      }
    }

    // Resolve leaveType: accept ObjectId, code, or name. If not found, create a new LeaveType with defaults.
    let lt: any = null;
    let leaveTypeId: any = null;

    const isObjectId = (val: string) => /^[0-9a-fA-F]{24}$/.test(val);

    if (isObjectId(leaveTypeInput)) {
      lt = await LeaveType.findById(leaveTypeInput).lean();
    }

    if (!lt) {
      // try find by exact name (case-insensitive) or code
      const escaped = String(leaveTypeInput).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      lt = await LeaveType.findOne({ $or: [ { name: new RegExp('^' + escaped + '$', 'i') }, { code: String(leaveTypeInput).toUpperCase() } ] }).lean();
    }

    if (!lt) {
      // create a new leave type automatically (annualQuota 0 = unpaid by default)
      const generateCode = (name: string) => {
        const parts = name.split(/\s+/).filter(Boolean);
        let code = parts.map(p => p[0]).join('').slice(0, 3).toUpperCase();
        if (!code) code = name.substring(0, 3).toUpperCase();
        return code;
      };

      let code = generateCode(String(leaveTypeInput));
      // ensure unique code
      let suffix = 0;
      while (await LeaveType.findOne({ code })) {
        suffix += 1;
        code = (code + String(suffix)).slice(0, 6).toUpperCase();
      }

      const createdLt = await LeaveType.create({ code, name: String(leaveTypeInput), annualQuota: 0, carryForward: false, requiresApproval: true, isActive: true });
      lt = createdLt.toObject ? createdLt.toObject() : createdLt;
    }

    leaveTypeId = lt._id;

    // Check overlapping leave requests for this user
    const overlapping = await LeaveRequest.findOne({
      user: userId,
      status: { $in: ["pending", "approved"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    }).lean();
    if (overlapping) return NextResponse.json(errorResp("Overlapping leave exists"), { status: 409 });

    // Calculate days and minutes requested
    const totalDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    let totalMinutes = 0;
    if (duration === "full-day") {
      // assume 8 hours per day -> 480 minutes
      totalMinutes = totalDays * 480;
    } else {
      // half-day -> 240 minutes
      if (totalDays !== 1) return NextResponse.json(errorResp("Half-day allowed only for single date"), { status: 400 });
      totalMinutes = 240;
    }

    // Check balance unless unpaid leave type (we'll treat leave types with annualQuota === 0 as unpaid)
    if (lt.annualQuota > 0) {
      const year = new Date(startDate).getFullYear();
      let balance = await LeaveBalance.findOne({ user: userId, year, leaveType: leaveTypeId }).lean();
      if (!balance) {
        // create initial balance from leave type annual quota
        balance = await LeaveBalance.create({ user: userId, year, leaveType: leaveTypeId, totalAllocated: lt.annualQuota, used: 0 });
      }
      const remaining = (balance.totalAllocated || 0) - (balance.used || 0);
      if (totalMinutes > remaining) {
        return NextResponse.json(errorResp("Insufficient leave balance"), { status: 400 });
      }
    }

    const created = await LeaveRequest.create({
      user: userId,
      leaveType: leaveTypeId,
      startDate,
      endDate,
      duration,
      reason,
      status: lt.requiresApproval ? "pending" : "approved",
      appliedAt: new Date()
    });

    for (const a of attachments) {
      await LeaveAttachment.create({ leaveRequest: created._id, ...a });
    }

    // Audit: record leave applied
    try {
      await AuditLog.create({
        action: "leave_apply",
        user: userId,
        affectedUser: created.user,
        entity: "LeaveRequest",
        entityId: created._id,
        newValues: { status: created.status, startDate: created.startDate, endDate: created.endDate }
      });
    } catch (e) {
      console.warn("Failed to write audit log for leave apply", e);
    }

    // if automatic approval (requiresApproval false), deduct balance now
    if (!lt.requiresApproval) {
      if (lt.annualQuota > 0) {
        const year = new Date(startDate).getFullYear();
        const bal = await LeaveBalance.findOne({ user: userId, year, leaveType: leaveTypeId });
        if (bal) {
          bal.used = (bal.used || 0) + totalMinutes;
          await bal.save();
        }
      }
    }

    return NextResponse.json(successResp("Leave applied", { id: created._id.toString(), status: created.status }), { status: 201 });
  } catch (error: any) {
    console.error("Leave apply error:", error);
    // In development it's useful to return the error details to aid debugging.
    // Remove or sanitize in production.
    return NextResponse.json(errorResp("Failed to apply leave", error?.message || error), { status: 500 });
  }
}
