import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import "@/models/Organization";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  await connectDB();
  const user = await User.findOne({
    _id: payload.sub,
    isDeleted: false
  }).populate({ path: "organizationId", strictPopulate: false }).lean();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const u = user as any;
  if (u.role !== "SUPER_ADMIN" && u.organizationId?.status && u.organizationId.status !== "ACTIVE") {
    return NextResponse.json({ user: null }, { status: 403 });
  }
  return NextResponse.json({
    user: {
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      organizationId: u.organizationId?._id?.toString() || null,
      organizationName: u.organizationId?.name || null
    }
  });
}

