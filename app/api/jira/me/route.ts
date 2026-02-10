import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import { Sprint } from "@/models/Sprint";
import { Notification } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * GET: Personal dashboard data for current user
 * Returns: my issues, my projects, recent activity, notifications
 */
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    // Get my assigned issues
    const myIssues = await Task.find({
      assignee: payload.sub
    })
      .populate("project", "name key")
      .select("key summary status priority createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    // Count by status
    const issuesByStatus = await Task.aggregate([
      { $match: { assignee: payload.sub } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get my recent activity (issues created or updated by me)
    const recentActivity = await Task.find({
      $or: [
        { createdBy: payload.sub },
        { updatedBy: payload.sub }
      ]
    })
      .select("key summary status updatedAt updatedBy")
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    // Get unread notifications
    const unreadNotifications = await Notification.find({
      recipient: payload.sub,
      isRead: false
    })
      .select("title message type createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get active sprints with my issues
    const activeSprints = await Sprint.find({
      status: "active"
    })
      .select("name goal startDate endDate")
      .limit(5)
      .lean();

    // Get my projects
    const myProjects = await Project.find({
      members: payload.sub
    })
      .select("name key description")
      .limit(5)
      .lean();

    return NextResponse.json(
      successResp("Personal dashboard data", {
        user: {
          id: payload.sub
        },
        myIssues: myIssues.map((i: any) => ({
          id: i._id.toString(),
          key: i.key,
          summary: i.summary,
          status: i.status,
          priority: i.priority,
          project: i.project
        })),
        issueStats: {
          total: issuesByStatus.reduce((sum: number, item: any) => sum + item.count, 0),
          byStatus: Object.fromEntries(
            issuesByStatus.map((item: any) => [item._id, item.count])
          )
        },
        recentActivity: recentActivity.map((a: any) => ({
          key: a.key,
          summary: a.summary,
          status: a.status,
          updatedAt: a.updatedAt
        })),
        unreadNotifications: unreadNotifications.map((n: any) => ({
          id: n._id.toString(),
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt
        })),
        unreadCount: unreadNotifications.length,
        activeSprints: activeSprints.map((s: any) => ({
          id: s._id.toString(),
          name: s.name,
          goal: s.goal,
          startDate: s.startDate,
          endDate: s.endDate
        })),
        myProjects: myProjects.map((p: any) => ({
          id: p._id.toString(),
          name: p.name,
          key: p.key,
          description: p.description
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/me/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve dashboard data", err?.message || err),
      { status: 500 }
    );
  }
}
