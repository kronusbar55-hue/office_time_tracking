import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { ProjectMemberRole, ProjectRole } from "@/models/ProjectAutomation";
import { IssueType, Status, Workflow } from "@/models/IssueWorkflow";
import { requirePermission } from "@/lib/jiraPermissions";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["create_project"]);
    if (!authorized) return response;

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      name: string;
      key: string;
      description?: string;
      type: "scrum" | "kanban" | "custom";
      visibility: "public" | "private" | "team";
      logo?: string;
      teamMembers?: string[];
    };

    if (!body.name || !body.key) {
      return NextResponse.json(
        errorResp("Missing required fields: name, key"),
        { status: 400 }
      );
    }

    // Check if project key already exists
    const existing = await Project.findOne({ key: body.key.toUpperCase() });
    if (existing) {
      return NextResponse.json(
        errorResp("Project key already exists"),
        { status: 409 }
      );
    }

    // Create project
    const project = await Project.create({
      name: body.name,
      key: body.key.toUpperCase(),
      description: body.description,
      status: "active",
      logoUrl: body.logo,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
      createdBy: payload.sub,
      members: [payload.sub, ...(body.teamMembers || [])],
      metadata: {
        type: body.type,
        visibility: body.visibility
      }
    });

    // Create default project roles
    const roles = ["Developer", "QA", "Manager", "Viewer"].map((name) => ({
      project: project._id,
      name,
      permissions: getDefaultPermissions(name),
      isSystem: true
    }));

    const createdRoles = await ProjectRole.insertMany(roles);

    // Assign owner as Manager
    await ProjectMemberRole.create({
      project: project._id,
      user: payload.sub,
      roles: [createdRoles.find((r: any) => r.name === "Manager")?._id]
    });

    // Create default statuses
    const statuses = [
      { name: "Backlog", category: "todo", color: "#4a5568", sortOrder: 0 },
      { name: "To Do", category: "todo", color: "#667eea", sortOrder: 1 },
      { name: "In Progress", category: "inProgress", color: "#f6ad55", sortOrder: 2 },
      { name: "In Review", category: "inProgress", color: "#ed8936", sortOrder: 3 },
      { name: "Testing", category: "inProgress", color: "#ecc94b", sortOrder: 4 },
      { name: "Done", category: "done", color: "#48bb78", sortOrder: 5 },
      { name: "Blocked", category: "blocked", color: "#f56565", sortOrder: 6 }
    ];

    const createdStatuses = await Status.insertMany(
      statuses.map((s) => ({ project: project._id, ...s }))
    );

    // Create default issue types
    const issueTypes = [
      { name: "Epic", label: "EPIC", hierarchy: 0, color: "#6b46c1" },
      { name: "Story", label: "STORY", hierarchy: 1, color: "#667eea" },
      { name: "Task", label: "TASK", hierarchy: 2, color: "#4299e1" },
      { name: "Sub-task", label: "SUBTASK", hierarchy: 3, color: "#38b2ac" },
      { name: "Bug", label: "BUG", hierarchy: 2, color: "#f56565" },
      { name: "Improvement", label: "IMPROVEMENT", hierarchy: 2, color: "#ed8936" }
    ];

    await IssueType.insertMany(
      issueTypes.map((it) => ({ project: project._id, isSystem: true, ...it }))
    );

    // Create default workflow
    const transitions = createdStatuses.map((status: any, idx: number) => {
      const nextStatuses = createdStatuses.slice(idx + 1).map((s: any) => s._id.toString());
      return {
        fromStatus: status._id.toString(),
        toStatus: nextStatuses[0] || status._id.toString(),
        allowedRoles: ["developer", "manager", "qa"]
      };
    });

    await Workflow.create({
      project: project._id,
      name: "Default Workflow",
      statuses: createdStatuses.map((s: any) => s._id),
      transitions,
      isDefault: true
    });

    return NextResponse.json(
      successResp("Project created successfully", {
        id: project._id.toString(),
        name: project.name,
        key: project.key,
        type: body.type
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/projects/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create project", err?.message || err),
      { status: 500 }
    );
  }
}

function getDefaultPermissions(roleName: string): string[] {
  const permissionMap: Record<string, string[]> = {
    Developer: [
      "create_issue",
      "edit_issue",
      "change_status",
      "log_time",
      "view_reports"
    ],
    QA: [
      "create_issue",
      "edit_issue",
      "change_status",
      "log_time",
      "view_reports"
    ],
    Manager: [
      "create_issue",
      "edit_issue",
      "assign_issue",
      "change_status",
      "log_time",
      "create_sprint",
      "manage_sprint",
      "manage_workflow",
      "manage_members",
      "view_reports",
      "manage_automation"
    ],
    Viewer: ["view_reports"]
  };

  return permissionMap[roleName] || [];
}
