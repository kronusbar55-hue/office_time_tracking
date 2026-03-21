import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import mongoose from "mongoose";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: Params) {
  try {
    const token = cookies().get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const query: any = { _id: params.id, isDeleted: false };
    if (payload.role !== "SUPER_ADMIN") query.organizationId = payload.orgId;

    const task = await Task.findOne(query)
      .populate("project", "name")
      .populate("assignee", "firstName lastName email avatarUrl")
      .populate("reporter", "firstName lastName email avatarUrl")
      .lean();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ data: task });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const token = cookies().get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const query: any = { _id: params.id, isDeleted: false };
    if (payload.role !== "SUPER_ADMIN") query.organizationId = payload.orgId;

    const body = await request.json();
    const updated = await Task.findOneAndUpdate(query, { $set: body }, { new: true }).lean();

    if (!updated) return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const token = cookies().get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const query: any = { _id: params.id, isDeleted: false };
    if (payload.role !== "SUPER_ADMIN") query.organizationId = payload.orgId;

    const deleted = await Task.findOneAndUpdate(query, { $set: { isDeleted: true } }, { new: true }).lean();

    if (!deleted) return NextResponse.json({ error: "Task not found or unauthorized" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
