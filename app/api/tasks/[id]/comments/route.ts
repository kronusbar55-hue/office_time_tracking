import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Comment } from "@/models/Comment";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import TaskActivityLog from "@/models/TaskActivityLog";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const comments = await Comment.find({ taskId: params.id })
      .populate("author", "firstName lastName avatarUrl")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: comments.length, data: comments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { content } = await req.json();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const comment = await Comment.create({
      taskId: params.id,
      author: payload.sub,
      content,
    });

    const populated = await Comment.findById(comment._id).populate("author", "firstName lastName avatarUrl");

    // Add activity log
    await TaskActivityLog.create({
      task: params.id as any,
      user: payload.sub,
      eventType: "COMMENT_ADDED",
      description: "Added a comment",
      metadata: { commentId: comment._id }
    });

    return NextResponse.json({ success: true, data: populated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
