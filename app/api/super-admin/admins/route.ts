import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload || payload.role !== "super-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const admins = await User.find({ role: "admin", isDeleted: false })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json(
    admins.map((u: any) => ({
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt
    }))
  );
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload || payload.role !== "super-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const { firstName, lastName, email, password } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await User.findOne({ email, isDeleted: false }).lean();
  if (existing) {
    return NextResponse.json({ error: "Email already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    role: "admin",
    isActive: true
  });

  // For SaaS parent-child logic, an Admin is their own tenant root.
  // We set their tenantId to their own _id.
  created.tenantId = created._id;
  await created.save();

  return NextResponse.json({
    id: created._id.toString(),
    firstName: created.firstName,
    lastName: created.lastName,
    email: created.email,
    role: created.role,
    isActive: created.isActive
  }, { status: 201 });
}
