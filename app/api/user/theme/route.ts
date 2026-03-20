import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const { themePreference } = body;

    if (!["light", "dark", "system"].includes(themePreference)) {
      return NextResponse.json({ error: "Invalid theme value" }, { status: 400 });
    }

    const user = await User.findById(decoded.sub);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.themePreference = themePreference;
    await user.save();

    return NextResponse.json({ success: true, themePreference });
  } catch (err: any) {
    console.error("PUT /api/user/theme error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
