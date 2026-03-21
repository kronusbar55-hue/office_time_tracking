import crypto from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  await connectDB();
  const { token, password } = await request.json();
  if (!token || !password) {
    return NextResponse.json(errorResp("Token and password required"), { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");
  const reset = await PasswordResetToken.findOne({
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!reset) {
    return NextResponse.json(errorResp("Invalid or expired reset token"), { status: 400 });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  await User.findByIdAndUpdate(reset.user, { passwordHash });
  reset.usedAt = new Date();
  await reset.save();

  return NextResponse.json(successResp("Password reset successful"));
}

