import crypto from "crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { successResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  await connectDB();
  const { email } = await request.json();
  if (!email) return NextResponse.json(successResp("If account exists, reset link sent"));

  const user = await User.findOne({ email: String(email).toLowerCase(), isDeleted: false })
    .select("_id")
    .lean() as any;
  if (!user) return NextResponse.json(successResp("If account exists, reset link sent"));

  const rawToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt
  });

  // In production integrate email delivery provider.
  return NextResponse.json(successResp("Password reset token generated", { resetToken: rawToken }));
}

