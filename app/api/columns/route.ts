import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Status } from "@/models/IssueWorkflow";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");

    if (!project) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    const statuses = await Status.find({ project }).sort({ sortOrder: 1 }).lean();
    return NextResponse.json({ data: statuses });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload || (payload.role !== "admin" && payload.role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { project, name, category, color, sortOrder } = await request.json();

    if (!project || !name) {
      return NextResponse.json({ error: "Project and Name are required" }, { status: 400 });
    }

    const status = await Status.create({
      project,
      name,
      category: category || "todo",
      color: color || "#4a5568",
      sortOrder: sortOrder || 0
    });

    return NextResponse.json({ data: status }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
