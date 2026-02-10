import { connectDB } from "@/lib/db";
import { TaskAuditLog } from "@/models/TaskAuditLog";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskId = params.id;

    const logs = await TaskAuditLog.find({ taskId })
      .populate({ path: "changedBy", select: "firstName lastName email role" })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
