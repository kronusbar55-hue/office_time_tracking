import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const projects = await Project.find({
    status: { $ne: "archived" },
    members: payload.sub
  })
    .sort({ createdAt: -1 })
    .select({ _id: 1, name: 1 })
    .lean();

  return NextResponse.json(
    projects.map((p) => ({
      _id: p._id.toString(),
      projectName: p.name
    }))
  );
}

