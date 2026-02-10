import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveRequest } from "@/models/LeaveRequest";
import mongoose from "mongoose";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    // Return the current user's recent leave requests
    const userId = new mongoose.Types.ObjectId(payload.sub);
    const reqs = await LeaveRequest.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ data: reqs });
  } catch (err) {
    console.error("/api/leaves/debug/requests error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
