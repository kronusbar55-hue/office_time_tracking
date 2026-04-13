import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifyAuthToken } from "@/lib/auth";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  await connectDB();

  try {
    // Get token from cookie
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(errorResp("No authentication token"), { status: 401 });
    }

    // Verify the token
    const payload = verifyAuthToken(token);
    if (!payload || !payload.sessionId) {
      return NextResponse.json(errorResp("Invalid token"), { status: 401 });
    }

    // Find the user
    const user = await User.findOne({
      _id: payload.sub,
      isDeleted: false,
      isActive: true
    }).select('+sessionId');

    if (!user) {
      return NextResponse.json(errorResp("User not found"), { status: 401 });
    }

    // Check if session ID matches
    if (!user.sessionId || user.sessionId !== payload.sessionId) {
      return NextResponse.json(errorResp("Session expired"), { status: 401 });
    }
 
    return NextResponse.json(successResp("Session valid", {
      valid: true,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    }));

  } catch (error) {
    console.error("Session validation error:", error);
    return NextResponse.json(errorResp("Session validation failed"), { status: 500 });
  }
}