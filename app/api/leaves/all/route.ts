import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveAttachment } from "@/models/LeaveAttachment";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // only admins can list all
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const filter: any = {};
    if (userId) filter.user = new mongoose.Types.ObjectId(userId);
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
