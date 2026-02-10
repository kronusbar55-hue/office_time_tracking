import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TaskAuditLog } from "@/models/TaskAuditLog";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const user = searchParams.get("user");

    const q: any = { taskId: params.id };
    if (action) q.actionType = action;
    if (user) q.changedBy = user;

    const logs = await TaskAuditLog.find(q).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ data: logs });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
