import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { verifyAuthToken } from "@/lib/auth";
import { SUPER_ADMIN_ROLE } from "@/lib/superAdmin";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload || (payload.role !== "admin" && payload.role !== SUPER_ADMIN_ROLE)) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(errorResp("Email and password are required"), { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(errorResp("User not found"), { status: 404 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user.passwordHash = passwordHash;
    await user.save();

    return NextResponse.json(successResp("Password updated successfully"));
  } catch (error: any) {
    console.error("Update password error:", error);
    return NextResponse.json(errorResp("Internal server error", error), { status: 500 });
  }
}
