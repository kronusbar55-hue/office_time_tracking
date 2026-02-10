import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import cloudinary from "@/lib/cloudinary";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const url = new URL(request.url);
  const forCurrentUser = url.searchParams.get("forCurrentUser") === "true";

  const query: Record<string, unknown> = { status: { $ne: "archived" } };
  if (forCurrentUser) {
    query.members = payload.sub;
  }

  const projects = await Project.find(query)
    .sort({ createdAt: -1 })
    .populate({
      path: "members",
      select: "firstName lastName avatarUrl"
    })
    .lean();

  return NextResponse.json(
    projects.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      clientName: p.clientName,
      description: p.description,
      status: p.status,
      logoUrl: p.logoUrl,
      color: p.color,
      members: (p.members as typeof User[]).map((m) => ({
        id: m._id.toString(),
        firstName: m.firstName,
        lastName: m.lastName,
        avatarUrl: m.avatarUrl
      }))
    }))
  );
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const contentType = request.headers.get("content-type") || "";

  let name = "";
  let clientName: string | undefined;
  let description: string | undefined;
  let status = "active";
  let memberIds: string[] = [];
  let logoUrl: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    name = String(formData.get("name") || "").trim();
    clientName = formData.get("clientName")
      ? String(formData.get("clientName"))
      : undefined;
    description = formData.get("description")
      ? String(formData.get("description"))
      : undefined;
    status = (formData.get("status") as string) || "active";
    memberIds = formData.getAll("memberIds").map((v) => String(v));

    const logo = formData.get("logo");
    if (logo && logo instanceof File && logo.size > 0) {
      try {
        const buffer = Buffer.from(await logo.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUri = `data:${logo.type};base64,${base64}`;
        const res = await cloudinary.uploader.upload(dataUri, { folder: 'projects/logos', resource_type: 'image', transformation: { width: 400, height: 400, crop: 'limit' } });
        logoUrl = res.secure_url;
      } catch (e) {
        console.warn('Cloudinary logo upload failed, falling back to local save', e);
        const buffer = Buffer.from(await logo.arrayBuffer());
        const ext = logo.name.split('.').pop() || 'png';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        logoUrl = `/uploads/${fileName}`;
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
    name = body.name?.trim() || "";
    clientName = body.clientName;
    description = body.description;
    status = body.status || "active";
    memberIds = body.memberIds ?? [];
    logoUrl = body.logoUrl;
  }

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  const colors = ["#4F46E5", "#22C55E", "#F97316", "#EC4899", "#06B6D4"];
  const color =
    colors[
      Math.abs(
        name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      ) % colors.length
    ];

  const created = await Project.create({
    name,
    clientName,
    description,
    status,
    members: memberIds,
    logoUrl,
    color,
    createdBy: payload.sub
  });

  const populated = await created.populate({
    path: "members",
    select: "firstName lastName avatarUrl"
  });

  return NextResponse.json(
    {
      id: populated._id.toString(),
      name: populated.name,
      clientName: populated.clientName,
      description: populated.description,
      status: populated.status,
      logoUrl: populated.logoUrl,
      color: populated.color,
      members: (populated.members as typeof User[]).map((m) => ({
        id: m._id.toString(),
        firstName: m.firstName,
        lastName: m.lastName,
        avatarUrl: m.avatarUrl
      }))
    },
    { status: 201 }
  );
}

