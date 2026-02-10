import { NextResponse } from "next/server";
import { successResp } from "@/lib/apiResponse";

export async function POST() {
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

