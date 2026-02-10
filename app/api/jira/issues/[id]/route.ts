import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { IssueComment, TimeLog } from "@/models/IssueCollaboration";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const issueId = params.id;

    const issue = await Task.findById(issueId)
      .populate("assignee", "firstName lastName email avatar")
      .populate("createdBy", "firstName lastName")
      .populate("reportedBy", "firstName lastName")
      .lean();

    if (!issue) {
      return NextResponse.json(
        errorResp("Issue not found"),
        { status: 404 }
      );
    }

    // Get comments with populated author
    const comments = await IssueComment.find({
      issue: issueId,
      parentComment: null
    })
      .populate("author", "firstName lastName email avatar")
      .populate({
        path: "replies",
        select: "content author createdAt updatedAt",
        populate: { path: "author", select: "firstName lastName email avatar" }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Get time logs
    const timeLogs = await TimeLog.find({ issue: issueId })
      .populate("loggedBy", "firstName lastName")
      .sort({ loggedDate: -1 })
      .lean();

    const totalTimeSpent = timeLogs.reduce((acc: number, log: any) => acc + log.timeSpentMinutes, 0);

    // Get watchers
    const watchers = await User.find(
      { _id: { $in: issue.watchers || [] } },
      "firstName lastName email avatar"
    ).lean();

    // Get activity log (simplified - last 10 updates)
    const activityLog = [
      {
        action: "created",
        user: issue.createdBy,
        timestamp: issue.createdAt,
        details: "Issue created"
      },
      // Add more activities based on task history if available
    ];

    return NextResponse.json(
      successResp("Issue retrieved", {
        issue: {
          id: issue._id.toString(),
          key: issue.key,
          summary: issue.summary,
          description: issue.description,
          type: issue.type,
          status: issue.status,
          priority: issue.priority,
          assignee: issue.assignee,
          reportedBy: issue.reportedBy,
          labels: issue.labels,
          totalTimeSpent,
          estimatedTime: issue.estimatedTime,
          created: issue.createdAt,
          updated: issue.updatedAt
        },
        comments: comments.map((c: any) => ({
          id: c._id.toString(),
          content: c.content,
          author: c.author,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          likes: c.likes?.length || 0,
          isEdited: c.isEdited,
          replies: c.replies || []
        })),
        timeLogs: timeLogs.map((log: any) => ({
          id: log._id.toString(),
          timeSpent: log.timeSpentMinutes,
          isBillable: log.isBillable,
          description: log.description,
          loggedBy: log.loggedBy,
          loggedDate: log.loggedDate
        })),
        watchers,
        activityLog
      })
    );
  } catch (err: any) {
    console.error("[jira/issues/[id]/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve issue", err?.message || err),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const issueId = params.id;
    const body = (await request.json().catch(() => ({}))) as {
      summary?: string;
      description?: string;
      status?: string;
      priority?: string;
      assignee?: string;
      labels?: string[];
      estimatedTime?: number;
    };

    const issue = await Task.findByIdAndUpdate(
      issueId,
      {
        $set: {
          ...(body.summary && { summary: body.summary }),
          ...(body.description && { description: body.description }),
          ...(body.status && { status: body.status }),
          ...(body.priority && { priority: body.priority }),
          ...(body.assignee && { assignee: body.assignee }),
          ...(body.labels && { labels: body.labels }),
          ...(body.estimatedTime && { estimatedTime: body.estimatedTime }),
          updatedAt: new Date()
        }
      },
      { new: true }
    ).populate("assignee", "firstName lastName");

    if (!issue) {
      return NextResponse.json(
        errorResp("Issue not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Issue updated", {
        id: issue._id.toString(),
        key: issue.key,
        summary: issue.summary,
        status: issue.status,
        assignee: issue.assignee
      })
    );
  } catch (err: any) {
    console.error("[jira/issues/[id]/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update issue", err?.message || err),
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const issueId = params.id;

    // Delete associated comments and time logs
    await IssueComment.deleteMany({ issue: issueId });
    await TimeLog.deleteMany({ issue: issueId });

    // Delete issue
    const issue = await Task.findByIdAndDelete(issueId);

    if (!issue) {
      return NextResponse.json(
        errorResp("Issue not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Issue deleted", {
        id: issueId
      })
    );
  } catch (err: any) {
    console.error("[jira/issues/[id]/DELETE] error:", err);
    return NextResponse.json(
      errorResp("Failed to delete issue", err?.message || err),
      { status: 500 }
    );
  }
}
