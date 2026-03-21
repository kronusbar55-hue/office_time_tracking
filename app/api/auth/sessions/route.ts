import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { UserSession } from "@/models/UserSession";
import { connectDB } from "@/lib/db";
import { successResp, errorResp } from "@/lib/apiResponse";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET() {
  try {
    const ctx = await requireAuth();
    await connectDB();
    const sessions = await UserSession.find({
      user: ctx.token.sub,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      successResp(
        "Sessions fetched",
        sessions.map((s: any) => ({
          id: s._id.toString(),
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt
        }))
      )
    );
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }
    return NextResponse.json(errorResp("Failed to fetch sessions"), { status: 500 });
  }
}

export async function DELETE() {
  try {
    const ctx = await requireAuth();
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    const tokenHash = hashToken(token);

    await UserSession.updateMany(
      { user: ctx.token.sub, tokenHash },
      { revokedAt: new Date() }
    );

    return NextResponse.json(successResp("Current session revoked"));
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }
    return NextResponse.json(errorResp("Failed to revoke session"), { status: 500 });
  }
}

