import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuth();
    requireRole(ctx, ["SUPER_ADMIN"]);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get("search") || "").trim();

    const query: any = { isDeleted: false };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .populate({ path: "organizationId", select: "name slug status" })
      .lean();

    return NextResponse.json(
      successResp(
        "Platform users fetched",
        users.map((u: any) => ({
          id: u._id.toString(),
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          status: u.status,
          organizationId: u.organizationId?._id?.toString() || null,
          organizationName: u.organizationId?.name || null,
          joinDate: u.joinDate || u.createdAt
        }))
      )
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }
    if (err?.message === "FORBIDDEN") {
      return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    }
    return NextResponse.json(
      errorResp("Failed to fetch platform users", err?.message || err),
      { status: 500 }
    );
  }
}

