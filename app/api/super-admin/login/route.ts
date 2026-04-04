import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { signAuthToken } from "@/lib/auth";
import { successResp, errorResp } from "@/lib/apiResponse";
import crypto from "crypto";
import { UserSession } from "@/models/UserSession";
import { ensurePlatformSuperAdmin } from "@/lib/platform";

export async function POST(request: Request) {
  try {
    await connectDB();
    await ensurePlatformSuperAdmin();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(errorResp("Email and password required"), { status: 400 });
    }

    const user = await User.findOne({ 
        email: email.toLowerCase(), 
        role: "SUPER_ADMIN",
        isDeleted: false 
    });

    if (!user) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(errorResp("Invalid credentials"), { status: 401 });
    }

    const token = signAuthToken({
      sub: user._id.toString(),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: "SUPER_ADMIN",
      userStatus: user.status,
      orgStatus: null,
      plan: null,
      sessionType: "super-admin"
    });

    const res = NextResponse.json(successResp("Super Admin Login successful", {
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: "SUPER_ADMIN",
        sessionType: "super-admin"
      }
    }));

    await UserSession.create({
      user: user._id,
      organizationId: null,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      sameSite: "lax"
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(errorResp(error.message), { status: 500 });
  }
}
