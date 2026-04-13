import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getTenantContext } from "@/lib/tenantContext";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveAttachment } from "@/models/LeaveAttachment";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const tenantContext = await getTenantContext();
    const payload = tenantContext.payload;
    const effectiveTenantId = tenantContext.effectiveTenantId;

    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!effectiveTenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const tenantUserQuery: any = {
      isDeleted: false,
      $or: [
        { tenantId: effectiveTenantId },
        { _id: effectiveTenantId }
      ]
    };

    let tenantUserIds: mongoose.Types.ObjectId[] = [];
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return NextResponse.json({ data: [] });
      }
      const tenantUser = await User.findOne({ _id: new mongoose.Types.ObjectId(userId), ...tenantUserQuery }).select("_id");
      if (!tenantUser) return NextResponse.json({ data: [] });
      tenantUserIds = [tenantUser._id as mongoose.Types.ObjectId];
    } else {
      const tenantUsers = await User.find(tenantUserQuery).select("_id").lean();
      tenantUserIds = tenantUsers.map((u: any) => u._id);
      if (tenantUserIds.length === 0) {
        return NextResponse.json({ data: [] });
      }
    }

    const filter: any = { user: { $in: tenantUserIds } };
    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.$or = [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ];
    }

    const leaves = await LeaveRequest.find(filter)
      .populate("user", "firstName lastName email avatarUrl")
      .populate("leaveType", "name code")
      .populate("ccUsers", "firstName lastName email")
      .sort({ appliedAt: -1 })
      .lean();

    const result = await Promise.all(leaves.map(async (r: any) => {
      const atts = await LeaveAttachment.find({ leaveRequest: r._id }).lean();
      return { ...r, attachments: atts };
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/leaves/all error:", error);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}
