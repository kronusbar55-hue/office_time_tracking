import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import cloudinary from "@/lib/cloudinary";

type Params = {
  params: {
    id: string;
  };
};

export async function PUT(request: Request, { params }: Params) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  // Multi-tenant check
  const query: any = { _id: params.id };
  if (payload.role !== "SUPER_ADMIN") {
    query.organizationId = payload.orgId;
  }

  const contentType = request.headers.get("content-type") || "";
  const update: Record<string, any> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (formData.has("name")) update.name = String(formData.get("name")).trim();
    if (formData.has("status")) update.status = String(formData.get("status"));
    if (formData.has("memberIds")) update.members = formData.getAll("memberIds");

    const logo = formData.get("logo");
    if (logo && logo instanceof File && logo.size > 0) {
      const buffer = Buffer.from(await logo.arrayBuffer());
      const res = await cloudinary.uploader.upload(`data:${logo.type};base64,${buffer.toString("base64")}`, { folder: 'projects/logos' });
      update.logoUrl = res.secure_url;
    }
  } else {
    const body = await request.json();
    Object.assign(update, body);
  }

  const updated = await Project.findOneAndUpdate(
    query,
    { $set: update },
    { new: true }
  ).populate("members", "firstName lastName avatarUrl").lean();

  if (!updated) {
    return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
  }

  const u = updated as any;
  return NextResponse.json({
    id: u._id.toString(),
    name: u.name,
    status: u.status,
    members: u.members.map((m: any) => ({
        id: m._id.toString(),
        name: `${m.firstName} ${m.lastName}`,
        avatarUrl: m.avatarUrl
    }))
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const query: any = { _id: params.id };
  if (payload.role !== "SUPER_ADMIN") query.organizationId = payload.orgId;

  const deleted = await Project.findOneAndUpdate(
    query,
    { $set: { status: "archived" } },
    { new: true }
  ).lean();

  if (!deleted) return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });

  return NextResponse.json({ success: true });
}
