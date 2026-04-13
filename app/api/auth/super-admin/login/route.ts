import { NextResponse } from "next/server";
import { signAuthToken } from "@/lib/auth";
import { errorResp, successResp } from "@/lib/apiResponse";
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_ROLE, isValidSuperAdminLogin } from "@/lib/superAdmin";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(errorResp("Email and password are required"), { status: 400 });
  }

  if (!isValidSuperAdminLogin(email, password)) {
    return NextResponse.json(errorResp("Invalid credentials"), { status: 401 });
  }

  const token = signAuthToken({
    sub: SUPER_ADMIN_ROLE,
    role: SUPER_ADMIN_ROLE
  });

  const res = NextResponse.json(
    successResp("Authenticated", {
      user: {
        id: SUPER_ADMIN_ROLE,
        firstName: "Super",
        lastName: "Admin",
        email: SUPER_ADMIN_EMAIL,
        role: SUPER_ADMIN_ROLE
      }
    })
  );

  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60
  });

  return res;
}
