import { NextResponse } from "next/server";
import { successResp } from "@/lib/apiResponse";
import { cookies } from "next/headers";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { UserSession } from "@/models/UserSession";

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (token) {
    await connectDB();
    await UserSession.updateMany(
      { tokenHash: crypto.createHash("sha256").update(token).digest("hex") },
      { revokedAt: new Date() }
    );
  }

  const res = NextResponse.json(successResp("Logged out"));

  res.cookies.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return res;
}

