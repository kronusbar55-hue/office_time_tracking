import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ProjectMemberRole } from "@/models/ProjectAutomation";

export type JiraPermission =
  | "create_project"
  | "edit_project"
  | "delete_project"
  | "create_issue"
  | "edit_issue"
  | "delete_issue"
  | "assign_issue"
  | "change_status"
  | "log_time"
  | "create_sprint"
  | "manage_sprint"
  | "manage_workflow"
  | "manage_members"
  | "view_reports"
  | "create_board"
  | "manage_automation"
  | "admin";

const ROLE_PERMISSIONS: Record<string, JiraPermission[]> = {
  "super-admin": [
    "create_project", "edit_project", "delete_project", "create_issue", "edit_issue", "delete_issue",
    "assign_issue", "change_status", "log_time", "create_sprint", "manage_sprint", "manage_workflow",
    "manage_members", "view_reports", "create_board", "manage_automation", "admin"
  ],
  admin: [
    "create_project", "edit_project", "create_issue", "edit_issue", "assign_issue", "change_status",
    "log_time", "create_sprint", "manage_sprint", "manage_workflow", "manage_members", "view_reports",
    "create_board", "manage_automation"
  ],
  "project-manager": [
    "create_issue", "edit_issue", "assign_issue", "change_status", "log_time", "create_sprint",
    "manage_sprint", "manage_members", "view_reports", "create_board"
  ],
  "team-lead": [
    "create_issue", "edit_issue", "assign_issue", "change_status", "log_time", "create_sprint",
    "manage_sprint", "view_reports"
  ],
  developer: [
    "create_issue", "edit_issue", "change_status", "log_time", "view_reports"
  ],
  qa: [
    "create_issue", "edit_issue", "change_status", "log_time", "view_reports"
  ],
  viewer: [
    "view_reports"
  ]
};

export async function checkPermission(
  payload: any,
  permissionsNeeded: JiraPermission[],
  projectId?: string
) {
  // Super admin always has all permissions
  if (payload.role === "super-admin") {
    return true;
  }

  // Check system-level permissions
  const userPermissions = ROLE_PERMISSIONS[payload.role] || [];

  // If no project specified, just check system permissions
  if (!projectId) {
    return permissionsNeeded.some((p) => userPermissions.includes(p));
  }

  // Check project-specific permissions
  await connectDB();
  const memberRole = await ProjectMemberRole.findOne({
    project: projectId,
    user: payload.sub
  })
    .populate({
      path: "roles",
      select: "permissions"
    })
    .lean();

  if (!memberRole) {
    return false;
  }

  const projectPermissions = (memberRole.roles as any[]).flatMap((role: any) => role.permissions || []);
  const allPermissions = [...new Set([...userPermissions, ...projectPermissions])];

  return permissionsNeeded.some((p) => allPermissions.includes(p));
}

export async function requirePermission(
  permissionsNeeded: JiraPermission[],
  projectId?: string
) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return { authorized: false, response: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }

  const hasPermission = await checkPermission(payload, permissionsNeeded, projectId);

  if (!hasPermission) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, message: "You don't have permission to perform this action" },
        { status: 403 }
      )
    };
  }

  return { authorized: true, payload };
}
