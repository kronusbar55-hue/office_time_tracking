import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenantContext";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveAttachment } from "@/models/LeaveAttachment";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    const tenantContext = await getTenantContext();
    const payload = tenantContext.payload;
    const effectiveTenantId = tenantContext.effectiveTenantId;

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const query: any = {};

    if (payload.role && payload.role !== "admin") {
      query.user = new mongoose.Types.ObjectId(payload.sub);
    } else {
      if (!effectiveTenantId) return NextResponse.json({ data: [] });
      const tenantUsers = await User.find({
        isDeleted: false,
        $or: [{ tenantId: effectiveTenantId }, { _id: effectiveTenantId }]
      })
        .select("_id")
        .lean();

      const tenantUserIds = tenantUsers.map((u: any) => u._id);
      if (tenantUserIds.length === 0) return NextResponse.json({ data: [] });
      query.user = { $in: tenantUserIds };
    }

    const records = await LeaveRequest.find(query)
      .populate("user", "firstName lastName email avatarUrl")
      .populate("leaveType", "name code")
      .populate("ccUsers", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    const result = await Promise.all(records.map(async (r: any) => {
      const atts = await LeaveAttachment.find({ leaveRequest: r._id }).lean();
      return { ...r, attachments: atts };
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Leave my GET error:", error);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}
