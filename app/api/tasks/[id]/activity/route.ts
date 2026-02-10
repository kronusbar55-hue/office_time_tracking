import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TaskActivityLog from "@/models/TaskActivityLog";
import { Task } from "@/models/Task";

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    await connectDB();

    // Verify task exists
    const task = await Task.findById(params.id).select("_id").lean();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const sort = searchParams.get("sort") || "-createdAt"; // Default: newest first

    // Fetch activities
    const activities = await TaskActivityLog.find({
      task: params.id
    })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "user",
        select: "firstName lastName email role"
      })
      .lean();

    // Get total count
    const total = await TaskActivityLog.countDocuments({ task: params.id });

    return NextResponse.json({
      data: activities,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
