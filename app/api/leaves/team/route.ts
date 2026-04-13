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
    if (!effectiveTenantId) return NextResponse.json({ error: "Tenant not found" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userIdParam = searchParams.get("userId");

    const tenantUserQuery: any = {
      isDeleted: false,
      $or: [
        { tenantId: effectiveTenantId },
        { _id: effectiveTenantId }
      ]
    };

    const filter: any = {};

    if (payload.role === "admin") {
      if (userIdParam) {
        if (!mongoose.Types.ObjectId.isValid(userIdParam)) {
          return NextResponse.json({ data: [] });
        }
        const user = await User.findOne({ _id: new mongoose.Types.ObjectId(userIdParam), ...tenantUserQuery }).select("_id");
        if (!user) return NextResponse.json({ data: [] });
        filter.user = user._id as mongoose.Types.ObjectId;
      } else {
        const tenantUsers = await User.find(tenantUserQuery).select("_id").lean();
        const tenantUserIds = tenantUsers.map((u: any) => u._id);
        filter.user = { $in: tenantUserIds };
      }
    } else if (payload.role === "manager") {
      const mgrId = new mongoose.Types.ObjectId(payload.sub);
      const team = await User.find({ manager: mgrId, ...tenantUserQuery }).select("_id").lean();
      const memberIds = team.map((t) => t._id as mongoose.Types.ObjectId);
      memberIds.push(mgrId);
      filter.user = { $in: memberIds };
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status) filter.status = status;
    if (startDate && endDate) {
      filter.$or = [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }];
    }

    const leaves = await LeaveRequest.find(filter).sort({ appliedAt: -1 }).lean();

    const result = await Promise.all(leaves.map(async (r: any) => {
      const atts = await LeaveAttachment.find({ leaveRequest: r._id }).lean();
      return { ...r, attachments: atts };
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/leaves/team error:", error);
    return NextResponse.json({ error: "Failed to fetch team leaves" }, { status: 500 });
  }
}
