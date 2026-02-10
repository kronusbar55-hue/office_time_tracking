import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { LeaveAttachment } from "@/models/LeaveAttachment";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userIdParam = searchParams.get("userId");

    const filter: any = {};

    // Admin may query by userId or view all
    if (payload.role === "admin") {
      if (userIdParam) filter.user = new mongoose.Types.ObjectId(userIdParam);
    } else if (payload.role === "manager") {
      // fetch team members (users who have manager == current manager)
      const mgrId = new mongoose.Types.ObjectId(payload.sub);
      const team = await User.find({ manager: mgrId }).select("_id").lean();
      const memberIds = team.map((t) => t._id);
      // include manager's own id so they can see their leaves too
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
