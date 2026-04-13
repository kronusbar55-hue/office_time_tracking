import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenantContext";
import { LeaveRequest } from "@/models/LeaveRequest";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantContext = await getTenantContext();
    const effectiveTenantId = tenantContext.effectiveTenantId;
    if (!effectiveTenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 403 });

    await connectDB();
    const body = await request.json();
    const { id, managerComment } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const req = await LeaveRequest.findById(id);
    if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const owner = await User.findOne({
      _id: req.user,
      $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }]
    }).lean();
    if (!owner) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (req.status !== "pending") return NextResponse.json({ error: "Invalid state" }, { status: 400 });

    req.status = "rejected";
    req.manager = new mongoose.Types.ObjectId(payload.sub);
    req.managerComment = managerComment || "";
    await req.save();

    try {
      await AuditLog.create({
        action: "leave_reject",
        user: new mongoose.Types.ObjectId(payload.sub),
        affectedUser: req.user,
        entity: "LeaveRequest",
        entityId: req._id,
        oldValues: { status: "pending" },
        newValues: { status: "rejected" },
        reason: managerComment || ""
      });
    } catch (e) {
      console.warn("Failed to write audit log for leave reject", e);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("Leave reject error:", error);
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
