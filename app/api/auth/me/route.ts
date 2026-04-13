import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_ROLE } from "@/lib/superAdmin";

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

  if (payload.role === SUPER_ADMIN_ROLE) {
    return NextResponse.json({
      user: {
        id: payload.sub,
        firstName: "Super",
        lastName: "Admin",
        email: SUPER_ADMIN_EMAIL,
        role: SUPER_ADMIN_ROLE
      }
    });
  }

  await connectDB();
  const user = await User.findOne({
    _id: payload.sub,
    isDeleted: false
  }).lean();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const u = user as any;
  return NextResponse.json({
    user: {
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role
    }
  });
}

