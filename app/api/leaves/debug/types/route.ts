import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveType } from "@/models/LeaveType";

// This debug endpoint relies on cookies/auth and must always be dynamic.
// Mark it as force-dynamic so Next.js doesn't try to statically prerender it.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const types = await LeaveType.find({}).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({ data: types });
  } catch (err) {
    console.error("/api/leaves/debug/types error", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
