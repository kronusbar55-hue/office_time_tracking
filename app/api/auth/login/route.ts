import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { signAuthToken } from "@/lib/auth";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  await connectDB();

  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(errorResp("Email and password are required"), { status: 400 });
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false
  });

  if (!user || !user.isActive) {
    return NextResponse.json(errorResp("Invalid credentials"), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(errorResp("Invalid credentials"), { status: 401 });
  }

  const token = signAuthToken({
    sub: user._id.toString(),
    role: user.role
  });

  const res = NextResponse.json(successResp("Authenticated", {
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    }
  }));

  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return res;
}

