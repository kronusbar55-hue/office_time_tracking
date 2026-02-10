import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import IssueDependency from "@/models/IssueDependency";
import IssueLink from "@/models/IssueLink";
import { Task } from "@/models/Task";
import { Notification } from "@/models/IssueCollaboration";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * Create dependency between issues (same or cross-project)
 */
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
      sourceIssueId: string;
      targetIssueId: string;
      type: "blocks" | "is_blocked_by" | "relates_to" | "duplicates" | "clones" | "depends_on";
      description?: string;
      crossProject?: boolean;
    };

    if (!body.sourceIssueId || !body.targetIssueId || !body.type) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    // Verify issues exist
    const sourceIssue = await Task.findById(body.sourceIssueId);
    if (!sourceIssue) {
      return NextResponse.json(
        errorResp("Source issue not found"),
        { status: 404 }
      );
    }

    const targetIssue = await Task.findById(body.targetIssueId);
    if (!targetIssue) {
      return NextResponse.json(
        errorResp("Target issue not found"),
        { status: 404 }
      );
    }

    // Check if same project
    if (sourceIssue.project.toString() !== targetIssue.project.toString()) {
      // Cross-project dependency - use IssueLink instead
      const link = await IssueLink.create({
        sourceIssue: body.sourceIssueId,
        targetIssue: body.targetIssueId,
        sourceProject: sourceIssue.project,
        targetProject: targetIssue.project,
        linkType: body.type,
        description: body.description,
        createdBy: payload.sub
      });

      // Notify target issue assignee
      if (targetIssue.assignee) {
        await Notification.create({
          recipient: targetIssue.assignee,
          type: "issue_linked",
          title: `Issue linked: ${sourceIssue.key}`,
          message: `${sourceIssue.key} ${body.type.replace("_", " ")} ${targetIssue.key}`,
          relatedIssue: body.targetIssueId,
          channel: ["in_app", "email"]
        });
      }

      return NextResponse.json(
        successResp("Cross-project link created", {
          id: link._id.toString(),
          type: link.linkType
        }),
        { status: 201 }
      );
    }

    // Same-project dependency
    const dependency = await IssueDependency.create({
      sourceIssue: body.sourceIssueId,
      targetIssue: body.targetIssueId,
      type: body.type,
      description: body.description,
      status: "active",
      createdBy: payload.sub
    });

    // Notify target issue assignee about blocker
    if (body.type === "blocks" && targetIssue.assignee) {
      await Notification.create({
        recipient: targetIssue.assignee,
        type: "issue_blocked",
        title: `Issue blocked: ${sourceIssue.key}`,
        message: `${sourceIssue.key} blocks your issue ${targetIssue.key}`,
        relatedIssue: body.targetIssueId,
        channel: ["in_app", "email"]
      });
    }

    return NextResponse.json(
      successResp("Dependency created", {
        id: dependency._id.toString(),
        sourceKey: sourceIssue.key,
        targetKey: targetIssue.key,
        type: body.type
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/dependencies/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create dependency", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Get dependencies for an issue
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

    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");
    const direction = searchParams.get("direction") || "both"; // "inbound", "outbound", "both"

    if (!issueId) {
      return NextResponse.json(
        errorResp("Missing issueId"),
        { status: 400 }
      );
    }

    const outbound =
      direction === "outbound" || direction === "both"
        ? await IssueDependency.find({ sourceIssue: issueId, status: "active" })
            .populate("targetIssue", "key title status priority")
            .lean()
        : [];

    const inbound =
      direction === "inbound" || direction === "both"
        ? await IssueDependency.find({ targetIssue: issueId, status: "active" })
            .populate("sourceIssue", "key title status")
            .lean()
        : [];

    // Also get cross-project links
    const crossProjectOut = await IssueLink.find({ sourceIssue: issueId })
      .populate("targetIssue", "key title")
      .populate("targetProject", "name key")
      .lean();

    const crossProjectIn = await IssueLink.find({ targetIssue: issueId })
      .populate("sourceIssue", "key title")
      .populate("sourceProject", "name key")
      .lean();

    return NextResponse.json(
      successResp("Dependencies retrieved", {
        issueId,
        outbound: outbound.map((d: any) => ({
          id: d._id.toString(),
          targetKey: d.targetIssue?.key,
          targetTitle: d.targetIssue?.title,
          targetStatus: d.targetIssue?.status,
          type: d.type,
          description: d.description
        })),
        inbound: inbound.map((d: any) => ({
          id: d._id.toString(),
          sourceKey: d.sourceIssue?.key,
          sourceTitle: d.sourceIssue?.title,
          type: d.type,
          description: d.description
        })),
        crossProjectOutbound: crossProjectOut.map((link: any) => ({
          id: link._id.toString(),
          targetKey: link.targetIssue?.key,
          targetProject: link.targetProject?.name,
          type: link.linkType
        })),
        crossProjectInbound: crossProjectIn.map((link: any) => ({
          id: link._id.toString(),
          sourceKey: link.sourceIssue?.key,
          sourceProject: link.sourceProject?.name,
          type: link.linkType
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/dependencies/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve dependencies", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Update dependency status (e.g., mark as resolved)
 */
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      dependencyId: string;
      status: "active" | "resolved";
    };

    if (!body.dependencyId || !body.status) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const dependency = await IssueDependency.findByIdAndUpdate(
      body.dependencyId,
      { status: body.status },
      { new: true }
    ).populate("sourceIssue", "key");

    if (!dependency) {
      return NextResponse.json(
        errorResp("Dependency not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Dependency updated", {
        id: body.dependencyId,
        status: body.status
      })
    );
  } catch (err: any) {
    console.error("[jira/dependencies/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update dependency", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Delete dependency
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const dependencyId = searchParams.get("dependencyId");

    if (!dependencyId) {
      return NextResponse.json(
        errorResp("Missing dependencyId"),
        { status: 400 }
      );
    }

    const result = await IssueDependency.findByIdAndDelete(dependencyId);

    if (!result) {
      return NextResponse.json(
        errorResp("Dependency not found"),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResp("Dependency deleted", { id: dependencyId })
    );
  } catch (err: any) {
    console.error("[jira/dependencies/DELETE] error:", err);
    return NextResponse.json(
      errorResp("Failed to delete dependency", err?.message || err),
      { status: 500 }
    );
  }
}
