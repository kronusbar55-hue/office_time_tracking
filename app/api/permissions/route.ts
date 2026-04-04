import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Permission } from "@/models/Permission";
import { successResp, errorResp } from "@/lib/apiResponse";
import { requireAuth, requireRole } from "@/lib/authz";

export async function GET(request: Request) {
  try {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["ADMIN", "MANAGER", "EMPLOYEE"]);

    const permissions = await Permission.find({
      organizationId: ctx.user.organizationId
    }).lean();

    return NextResponse.json(successResp("Permissions fetched", permissions));
  } catch (err: any) {
    return NextResponse.json(errorResp(err.message), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["ADMIN"]);

    const { role, module, actions } = await request.json();

    if (!role || !module || !actions || !Array.isArray(actions)) {
      return NextResponse.json(errorResp("Missing required fields"), { status: 400 });
    }

    // Check if permission already exists
    const existing = await Permission.findOne({
      organizationId: ctx.user.organizationId,
      role,
      module
    });

    if (existing) {
      // Update existing
      existing.actions = actions;
      await existing.save();
      return NextResponse.json(successResp("Permission updated", existing));
    } else {
      // Create new
      const permission = await Permission.create({
        organizationId: ctx.user.organizationId,
        role,
        module,
        actions
      });
      return NextResponse.json(successResp("Permission created", permission));
    }
  } catch (err: any) {
    return NextResponse.json(errorResp(err.message), { status: 500 });
  }
}