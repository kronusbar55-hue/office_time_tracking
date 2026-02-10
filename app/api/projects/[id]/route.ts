import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import path from "path";
import { mkdir, writeFile } from "fs/promises";

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

  const contentType = request.headers.get("content-type") || "";

  const update: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (formData.has("name"))
      update.name = String(formData.get("name") || "").trim();
    if (formData.has("clientName"))
      update.clientName = String(formData.get("clientName") || "");
    if (formData.has("description"))
      update.description = String(formData.get("description") || "");
    if (formData.has("status"))
      update.status = String(formData.get("status") || "active");

    const memberIds = formData.getAll("memberIds").map((v) => String(v));
    if (memberIds.length) {
      update.members = memberIds;
    }

    const logo = formData.get("logo");
    if (logo && logo instanceof File && logo.size > 0) {
      try {
        const buffer = Buffer.from(await logo.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUri = `data:${logo.type};base64,${base64}`;
        const res = await cloudinary.uploader.upload(dataUri, { folder: 'projects/logos', resource_type: 'image', transformation: { width: 400, height: 400, crop: 'limit' } });
        update.logoUrl = res.secure_url;
        (update as any).logoPublicId = res.public_id;
        (update as any).logoSize = res.bytes;
      } catch (e) {
        console.warn('Cloudinary logo upload failed, falling back to local save', e);
        const buffer = Buffer.from(await logo.arrayBuffer());
        const ext = logo.name.split('.').pop() || 'png';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        update.logoUrl = `/uploads/${fileName}`;
      }
    }
  } else {
    const body = (await request.json()) as {
      name?: string;
      clientName?: string;
      description?: string;
      status?: string;
      memberIds?: string[];
      logoUrl?: string;
    };
    if (body.name !== undefined) update.name = body.name.trim();
    if (body.clientName !== undefined) update.clientName = body.clientName;
    if (body.description !== undefined) update.description = body.description;
    if (body.status !== undefined) update.status = body.status;
    if (body.memberIds !== undefined) update.members = body.memberIds;
    if (body.logoUrl !== undefined) update.logoUrl = body.logoUrl;
  }

  const updated = await Project.findByIdAndUpdate(
    params.id,
    { $set: update },
    { new: true }
  )
    .populate({
      path: "members",
      select: "firstName lastName avatarUrl"
    })
    .lean();

  if (!updated) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated._id.toString(),
    name: updated.name,
    clientName: updated.clientName,
    description: updated.description,
    status: updated.status,
    logoUrl: updated.logoUrl,
    color: updated.color,
    members: (updated.members as typeof User[]).map((m) => ({
      id: m._id.toString(),
      firstName: m.firstName,
      lastName: m.lastName,
      avatarUrl: m.avatarUrl
    }))
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const deleted = await Project.findByIdAndUpdate(
    params.id,
    { $set: { status: "archived" } },
    { new: true }
  ).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

