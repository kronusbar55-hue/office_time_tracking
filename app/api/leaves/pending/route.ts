import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import { User } from "@/models/User";
import mongoose from "mongoose";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    // fetch leaves pending for manager's team
    const uid = new mongoose.Types.ObjectId(payload.sub);
    // simple approach: find users where manager == uid
    const teamMembers = await User.find({ manager: uid }).select("_id").lean();
    const memberIds = teamMembers.map((m) => m._id);

    const pending = await LeaveRequest.find({ user: { $in: memberIds }, status: "pending" }).sort({ appliedAt: -1 }).lean();

    return NextResponse.json({ data: pending });
  } catch (error) {
    console.error("Leave pending GET error:", error);
    return NextResponse.json({ error: "Failed to fetch pending leaves" }, { status: 500 });
  }
}
