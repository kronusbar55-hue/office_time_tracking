import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTenantContext } from "@/lib/tenantContext";
import { LeaveRequest } from "@/models/LeaveRequest";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    const tenantContext = await getTenantContext();
    const payload = tenantContext.payload;
    const effectiveTenantId = tenantContext.effectiveTenantId;

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!effectiveTenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 403 });

    await connectDB();

    const uid = new mongoose.Types.ObjectId(payload.sub);
    let memberIds: mongoose.Types.ObjectId[] = [];

    if (payload.role === "manager") {
      const teamMembers = await User.find({ manager: uid, $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }] })
        .select("_id")
        .lean();
      memberIds = teamMembers.map((m) => m._id as mongoose.Types.ObjectId);
    } else if (payload.role === "admin") {
      const tenantUsers = await User.find({ isDeleted: false, $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }] })
        .select("_id")
        .lean();
      memberIds = tenantUsers.map((m) => m._id as mongoose.Types.ObjectId);
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (memberIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const pending = await LeaveRequest.find({ user: { $in: memberIds }, status: "pending" }).sort({ appliedAt: -1 }).lean();

    return NextResponse.json({ data: pending });
  } catch (error) {
    console.error("Leave pending GET error:", error);
    return NextResponse.json({ error: "Failed to fetch pending leaves" }, { status: 500 });
  }
}
