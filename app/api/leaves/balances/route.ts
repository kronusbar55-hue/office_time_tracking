import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveBalance } from "@/models/LeaveBalance";
import mongoose from "mongoose";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const userId = new mongoose.Types.ObjectId(payload.sub);

    const balances = await LeaveBalance.find({ user: userId }).populate("leaveType").lean();

    const result = balances.map((b: any) => ({
      _id: b._id,
      year: b.year,
      leaveType: b.leaveType,
      totalAllocated: b.totalAllocated,
      used: b.used,
      remaining: Math.max(0, b.totalAllocated - b.used)
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/leaves/balances error", error);
    return NextResponse.json({ error: "Failed to fetch balances" }, { status: 500 });
  }
}
