import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { errorResp, successResp } from "@/lib/apiResponse";
import { IssueComment } from "@/models/IssueCollaboration";
import { TaskActivityLog } from "@/models/TaskActivityLog";
import { Types } from "mongoose";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      issueId: string;
      content: string;
      parentCommentId?: string;
    };

    if (!body.issueId || !body.content) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    // Extract mentions from content (@mentioned users)
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = body.content.match(mentionRegex) || [];

    const comment = await IssueComment.create({
      issue: body.issueId,
      author: payload.sub,
      content: body.content,
      parentComment: body.parentCommentId || null,
      mentions: [],
      attachments: [],
      likes: [],
      isEdited: false
    });

    // Create activity log
    try {
      await TaskActivityLog.create({
        task: body.issueId as any,
        user: payload.sub,
        eventType: "COMMENT_ADDED",
        description: `Added a comment: "${body.content.slice(0, 50)}${body.content.length > 50 ? "..." : ""}"`,
        metadata: {
          commentId: comment._id
        }
      });
    } catch (e) {
      console.error("Failed to create activity log for comment:", e);
    }

    return NextResponse.json(
      successResp("Comment created", {
        id: comment._id.toString(),
        content: comment.content,
        authorId: comment.author.toString()
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/issues/comments/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create comment", err?.message || err),
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");

    if (!issueId) {
      return NextResponse.json(
        errorResp("Missing issue ID"),
        { status: 400 }
      );
    }

    const comments = await IssueComment.find({
      issue: issueId,
      parentComment: null // Only get top-level comments
    })
      .populate("author", "firstName lastName email")
      .populate({
        path: "children",
        select: "content author createdAt",
        populate: { path: "author", select: "firstName lastName" }
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      successResp("Comments retrieved", {
        comments: comments.map((c: any) => ({
          id: c._id.toString(),
          content: c.content,
          author: c.author,
          createdAt: c.createdAt,
          likes: c.likes?.length || 0,
          isEdited: c.isEdited
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/issues/comments/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve comments", err?.message || err),
      { status: 500 }
    );
  }
}
