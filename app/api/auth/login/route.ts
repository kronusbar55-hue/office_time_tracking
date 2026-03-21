import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import bcrypt from "bcryptjs";
import { signAuthToken } from "@/lib/auth";
import { successResp, errorResp } from "@/lib/apiResponse";
import { AuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";
import crypto from "crypto";
import { UserSession } from "@/models/UserSession";

export async function POST(request: Request) {
  await connectDB();

  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(errorResp("Email and password are required"), { status: 400 });
  }

  // Find user and include organization
  const user = await User.findOne({
    email: email.toLowerCase(),
    isDeleted: false
  }).populate("organizationId");

  if (!user) {
    return NextResponse.json(errorResp("Invalid credentials"), { status: 401 });
  }

  // Per requirement: Separate login flow for Super Admin
  if (user.role === "SUPER_ADMIN") {
    return NextResponse.json(errorResp("Please use the Super Admin login portal"), { status: 403 });
  }

  if (user.status !== "ACTIVE" || !user.isActive) {
    return NextResponse.json(errorResp("Your account is not active"), { status: 401 });
  }

  // Check Organization Status
  const org = user.organizationId as any;
  if (!org) {
    return NextResponse.json(errorResp("No organization associated with this account"), { status: 401 });
  }

  if (org.status !== "ACTIVE") {
    return NextResponse.json(errorResp(`Your organization is ${org.status.toLowerCase()}. Please contact support.`), { status: 403 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(errorResp("Invalid credentials"), { status: 401 });
  }

  const token = signAuthToken({
    sub: user._id.toString(),
    name: `${user.firstName} ${user.lastName}`,
    role: user.role as any,
    orgId: org._id.toString()
  });

  // Fetch assigned projects (scoped to organization naturally because users/projects are org-bound)
  const { Project } = await import("@/models/Project");
  const projects = await Project.find({
    members: user._id,
    status: { $ne: "archived" }
  }, "name").lean();

  const { EmployeeMonitor } = await import("@/models/EmployeeMonitor");
  const today = new Date().toISOString().split('T')[0];
  const firstEntry = await EmployeeMonitor.findOne({
    userId: user._id.toString(),
    date: today
  }).sort({ time: 1 }).lean();

  const isLogin = firstEntry ? 1 : 0;

  const res = NextResponse.json(successResp("Authenticated", {
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organizationId: org._id.toString(),
      organizationName: org.name,
      assignedProjects: projects.map((p: any) => ({
        id: p._id.toString(),
        name: p.name
      }))
    },
    isLogin,
    firstEntry
  }));

  try {
    await UserSession.create({
      user: user._id,
      organizationId: org._id,
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "",
      userAgent: request.headers.get("user-agent") || "",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await AuditLog.create({
      action: "login",
      user: user._id,
      organizationId: org._id,
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


