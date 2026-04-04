import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Permission } from "@/models/Permission";
import { successResp, errorResp } from "@/lib/apiResponse";
import { requireAuth, requireRole } from "@/lib/authz";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const ctx = await requireAuth();
    requireRole(ctx, ["ADMIN"]);

    const { actions } = await request.json();

    if (!actions || !Array.isArray(actions)) {
      return NextResponse.json(errorResp("Actions array required"), { status: 400 });
    }

    const permission = await Permission.findOneAndUpdate(
      {
        _id: params.id,
        organizationId: ctx.user.organizationId
      },
      { actions },
      { new: true }
    );

    if (!permission) {
      return NextResponse.json(errorResp("Permission not found"), { status: 404 });
    }

    return NextResponse.json(successResp("Permission updated", permission));
  } catch (err: any) {
    return NextResponse.json(errorResp(err.message), { status: 500 });
  }
}