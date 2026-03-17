import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Status } from "@/models/IssueWorkflow";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload || (payload.role !== "admin" && payload.role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updated = await Status.findByIdAndUpdate(params.id, body, { new: true });

    if (!updated) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload || (payload.role !== "admin" && payload.role !== "manager")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await Status.findByIdAndDelete(params.id);

    if (!deleted) {
      return NextResponse.json({ error: "Status not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Status deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
