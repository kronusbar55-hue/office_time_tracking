import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Only admin can view audit logs
    if (payload.role !== "admin") {
      return NextResponse.json(
        errorResp("You don't have access to audit logs"),
        { status: 403 }
      );
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const userId = searchParams.get("userId");
    const affectedUser = searchParams.get("affectedUser");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    let query: any = {};

    if (action) {
      query.action = action;
    }

    if (userId) {
      query.user = userId;
    }

    if (affectedUser) {
      query.affectedUser = affectedUser;
    }

    // Get audit logs
    const logs = await AuditLog.find(query)
      .populate("user", "firstName lastName email")
      .populate("affectedUser", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await AuditLog.countDocuments(query);

    return NextResponse.json(
      successResp("Audit logs retrieved", {
        total,
        limit,
        skip,
        logs: logs.map((log: any) => ({
          id: log._id.toString(),
          action: log.action,
          user: log.user
            ? {
                id: log.user._id.toString(),
                firstName: log.user.firstName,
                lastName: log.user.lastName,
                email: log.user.email
              }
            : null,
          affectedUser: log.affectedUser
            ? {
                id: log.affectedUser._id.toString(),
                firstName: log.affectedUser.firstName,
                lastName: log.affectedUser.lastName,
                email: log.affectedUser.email
              }
            : null,
          entity: log.entity,
          entityId: log.entityId.toString(),
          oldValues: log.oldValues,
          newValues: log.newValues,
          reason: log.reason,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt
        }))
      })
    );
  } catch (err: any) {
    console.error("[audit-logs] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve audit logs", err?.message || err),
      { status: 500 }
    );
  }
}
