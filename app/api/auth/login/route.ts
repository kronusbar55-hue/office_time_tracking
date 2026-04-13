import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { signAuthToken } from "@/lib/auth";
import { successResp, errorResp } from "@/lib/apiResponse";
import { AuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

export async function POST(request: Request) {
  await connectDB();

  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(errorResp("Email and password are required"), { status: 400 });
  }

  // Robust User model retrieval
  const UserModel = User;
  const user = await UserModel.findOne({
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

  // Generate unique session ID
  const sessionId = crypto.randomUUID();

  // Update user's session ID using updateOne to ensure it's saved
  await UserModel.updateOne(
    { _id: user._id },
    { $set: { sessionId: sessionId } }
  );

  // Handle tenant setup for admin users
  if (user.role === "admin" && !user.tenantId) {
    user.tenantId = user._id;
    await UserModel.updateMany(
      {
        _id: { $ne: user._id },
        isDeleted: false,
        role: { $ne: "admin" },
        $or: [{ tenantId: null }, { tenantId: { $exists: false } }]
      },
      {
        $set: { tenantId: user._id }
      }
    );
  }

  const token = signAuthToken({
    sub: user._id.toString(),
    role: user.role,
    tenantId: user.tenantId ? user.tenantId.toString() : null,
    sessionId: sessionId
  });

  // Fetch assigned projects
  const { Project } = await import("@/models/Project");
  const projects = await Project.find({
    members: user._id,
    status: { $ne: "archived" }
  }, "name").lean();

  const res = NextResponse.json(successResp("Authenticated", {
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      assignedProjects: projects.map((p: any) => ({
        id: p._id.toString(),
        name: p.name
      }))
    }
  }));

  // Log successful login
  try {
    await AuditLog.create({
      action: "login",
      user: user._id,
      entity: "User",
      entityId: user._id,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
      userAgent: request.headers.get("user-agent") || ""
    });
  } catch (e) {
    console.error("Failed to log login:", e);
  }

  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return res;
}

