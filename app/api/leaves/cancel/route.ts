import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveType } from "@/models/LeaveType";
import { LeaveBalance } from "@/models/LeaveBalance";
import { AuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const req = await LeaveRequest.findById(id);
    if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // allow employee to cancel their pending requests, or admin to cancel any
    const isOwner = String(req.user) === payload.sub;
    const isAdmin = payload.role === "admin";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // cancel pending directly
    if (req.status === "pending") {
      req.status = "cancelled";
      await req.save();
      try {
        const userId = new mongoose.Types.ObjectId(payload.sub);
        await AuditLog.create({
          action: "leave_cancel",
          user: userId,
          affectedUser: req.user,
          entity: "LeaveRequest",
          entityId: req._id,
          oldValues: { status: "pending" },
          newValues: { status: "cancelled" }
        });
      } catch (e) {
        console.warn("Failed to write audit log for leave cancel", e);
      }
      return NextResponse.json({ data: { success: true } });
    }

    // if approved, only admin can cancel and must restore balance
    if (req.status === "approved") {
      if (!isAdmin) return NextResponse.json({ error: "Cancellation requires admin approval" }, { status: 409 });

      // revert balance for paid leaves
      const lt = await LeaveType.findById(req.leaveType).lean();
      if (lt && lt.annualQuota > 0) {
        const s = new Date(req.startDate + "T00:00:00");
        const e = new Date(req.endDate + "T00:00:00");
        const totalDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalMinutes = req.duration === "full-day" ? totalDays * 480 : 240;
        const year = new Date(req.startDate).getFullYear();
        const bal = await LeaveBalance.findOne({ user: req.user, year, leaveType: req.leaveType });
        if (bal) {
          bal.used = Math.max(0, (bal.used || 0) - totalMinutes);
          await bal.save();
        }
      }

      req.status = "cancelled";
      await req.save();
      try {
        const userId = new mongoose.Types.ObjectId(payload.sub);
        await AuditLog.create({
          action: "leave_cancel",
          user: userId,
          affectedUser: req.user,
          entity: "LeaveRequest",
          entityId: req._id,
          oldValues: { status: "approved" },
          newValues: { status: "cancelled" }
        });
      } catch (e) {
        console.warn("Failed to write audit log for leave cancel", e);
      }

      return NextResponse.json({ data: { success: true } });
    }

    return NextResponse.json({ error: "Cannot cancel this request" }, { status: 400 });
  } catch (error) {
    console.error("Leave cancel error:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
