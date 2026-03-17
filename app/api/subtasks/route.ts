import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import { Task } from "@/models/Task";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const parentTask = searchParams.get("parentTask");

    if (!parentTask) {
      return NextResponse.json({ error: "Parent task ID is required" }, { status: 400 });
    }

    const subtasks = await SubTask.find({ parentTask, isDeleted: false }).sort({ createdAt: 1 }).lean();
    return NextResponse.json({ data: subtasks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? (verifyAuthToken(token) as any) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { parentTask, title, description, assignee, priority, dueDate } = body;

    if (!parentTask || !title) {
      return NextResponse.json({ error: "Parent task and Title are required" }, { status: 400 });
    }

    const parent = await Task.findById(parentTask);
    if (!parent) {
      return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
    }

    // Generate subtask key (e.g., PRJ-1-S1)
    const existingSubtasks = await SubTask.countDocuments({ parentTask });
    const key = `${parent.key}-S${existingSubtasks + 1}`;

    const subtask = await SubTask.create({
      key,
      title,
      description,
      parentTask,
      parentIssueType: parent.type?.toLowerCase() === "bug" ? "task" : (parent.type?.toLowerCase() || "task"),
      assignee,
      reporter: payload.sub,
      createdBy: payload.sub,
      status: "todo",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined
    });

    return NextResponse.json({ data: subtask }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
