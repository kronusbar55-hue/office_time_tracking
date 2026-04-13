import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { User } from "@/models/User";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload || payload.role !== "super-admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const { firstName, lastName, email, isActive } = body;

  const user = await User.findById(params.id);
  if (!user || user.isDeleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (firstName !== undefined) user.firstName = firstName;
  if (lastName !== undefined) user.lastName = lastName;
  if (email !== undefined) user.email = email;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();

  return NextResponse.json({
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  });
}
