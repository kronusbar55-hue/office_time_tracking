import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveType } from "@/models/LeaveType";
import { LeaveBalance } from "@/models/LeaveBalance";
import { TimeSession } from "@/models/TimeSession";
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
    const { id, managerComment } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const session = await mongoose.startSession();
    session.startTransaction();
    // only admins may approve (managers are read-only in this system)
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
      const req = await LeaveRequest.findById(id).session(session);
      if (!req) {
        await session.abortTransaction();
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (req.status !== "pending") {
        await session.abortTransaction();
        return NextResponse.json({ error: "Invalid state" }, { status: 400 });
      }

      const lt = await LeaveType.findById(req.leaveType).lean();
      if (!lt) {
        await session.abortTransaction();
        return NextResponse.json({ error: "Leave type missing" }, { status: 400 });
      }

      // calculate minutes
      const s = new Date(req.startDate + "T00:00:00");
      const e = new Date(req.endDate + "T00:00:00");
      const totalDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      let totalMinutes = 0;
      if (req.duration === "full-day") totalMinutes = totalDays * 480;
      else totalMinutes = 240;

      // deduct balance if paid leave
      if (lt.annualQuota > 0) {
        const year = new Date(req.startDate).getFullYear();
        const bal = await LeaveBalance.findOne({ user: req.user, year, leaveType: req.leaveType }).session(session);
        if (!bal) {
          await session.abortTransaction();
          return NextResponse.json({ error: "Balance not found" }, { status: 400 });
        }
        const remaining = (bal.totalAllocated || 0) - (bal.used || 0);
        if (totalMinutes > remaining) {
          await session.abortTransaction();
          return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
        }
        bal.used = (bal.used || 0) + totalMinutes;
        await bal.save({ session });
      }

      req.status = "approved";
      req.manager = new mongoose.Types.ObjectId(payload.sub);
      req.managerComment = managerComment || "";
      await req.save({ session });

      // Attendance integration: create TimeSession placeholders so attendance queries can pick up leave.
      try {
        for (let dt = new Date(req.startDate + "T00:00:00"); dt <= new Date(req.endDate + "T00:00:00"); dt.setDate(dt.getDate() + 1)) {
          const dateStr = dt.toISOString().slice(0, 10);
          const existing = await TimeSession.findOne({ user: req.user, date: dateStr }).session(session);
          if (!existing) {
            const ts = new TimeSession({
              user: req.user,
              date: dateStr,
              clockIn: new Date(dateStr + "T00:00:00"),
              clockOut: new Date(dateStr + "T00:00:00"),
              totalWorkMinutes: 0,
              totalBreakMinutes: 0,
              status: "completed",
              notes: `Leave: ${lt.name || "Leave"}`
            });
            await ts.save({ session });
          }
        }
      } catch (e) {
        console.warn("Failed to create TimeSession placeholders for approved leave", e);
      }

      // Audit
      try {
        await AuditLog.create({
          action: "leave_approve",
          user: new mongoose.Types.ObjectId(payload.sub),
          affectedUser: req.user,
          entity: "LeaveRequest",
          entityId: req._id,
          oldValues: { status: "pending" },
          newValues: { status: "approved" },
          reason: managerComment || ""
        });
      } catch (e) {
        console.warn("Failed to write audit log for leave approve", e);
      }
      // Attendance integration: for each approved date we could mark attendance as leave.
      // For simplicity, create a completed TimeSession placeholder with 0 work minutes to mark day as leave if needed elsewhere.
      // (Detailed attendance integration should update attendance API to consult LeaveRequest records.)
      await session.commitTransaction();
      session.endSession();
      return NextResponse.json({ data: { success: true } });
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      throw e;
    }
  } catch (error) {
    console.error("Leave approve error:", error);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
