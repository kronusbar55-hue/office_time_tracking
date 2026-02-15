import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveAttachment } from "@/models/LeaveAttachment";
import mongoose from "mongoose";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // If requester is admin, return all leave requests; otherwise return only user's
    const query: any = {};
    if (payload.role && payload.role !== "admin") {
      const userId = new mongoose.Types.ObjectId(payload.sub);
      query.user = userId;
    }

    const records = await LeaveRequest.find(query)
      .populate("user", "firstName lastName email avatarUrl")
      .populate("leaveType", "name code")
      .populate("ccUsers", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();

    // attach attachments
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
