import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
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

  const query: Record<string, any> = { 
    status: { $ne: "archived" },
    name: { $nin: ["Other", "other", "OTHER"] },
    organizationId: payload.orgId
  };

  const userId = payload.sub;
  const userRecord = await User.findById(userId).select("role").lean() as any;
  if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 401 });
  const userRole = String(userRecord.role || "").toLowerCase();

  // Enforce filtering for managers and employees
  // Admins and HR still see everything unless they explicitly request forCurrentUser
  if (forCurrentUser || userRole === "employee" || userRole === "manager") {
    query.members = userId;
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
      key: p.key,
      clientName: p.clientName,
      description: p.description,
      status: p.status,
      logoUrl: p.logoUrl,
      color: p.color,
      members: (p.members as any[]).map((m) => ({
        id: m._id.toString(),
        name: `${m.firstName} ${m.lastName}`,
        firstName: (m as any).firstName,
        lastName: (m as any).lastName,
        avatarUrl: (m as any).avatarUrl
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
  let key = "";
  let clientName: string | undefined;
  let description: string | undefined;
  let status = "active";
  let memberIds: string[] = [];
  let logoUrl: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    name = String(formData.get("name") || "").trim();
    key = String(formData.get("key") || "").trim();
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
    // Handling JSON body
    const body = (await request.json().catch(() => ({}))) as any;
    name = body.name?.trim() || "";
    key = body.key?.trim() || "";
    clientName = body.clientName;
    description = body.description;
    status = body.status || "active";
    memberIds = body.memberIds ?? [];
    logoUrl = body.logoUrl;
  }


  // Plan Restriction
  const org = await Organization.findById(payload.orgId).lean() as any;
  if (org && org.plan === "FREE") {
    const projectCount = await Project.countDocuments({ organizationId: payload.orgId });
    if (projectCount >= 5) {
      return NextResponse.json({ error: "Free plan is limited to 5 projects. Please upgrade." }, { status: 403 });
    }
  }

  if (!name) {
    return NextResponse.json(
      { error: "Project name is required" },
      { status: 400 }
    );
  }

  // Auto-generate key if not provided
  if (!key) {
    key = name
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 5);

    // Add unique suffix if needed
    const existingCount = await Project.countDocuments({ key: new RegExp(`^${key}`) });
    if (existingCount > 0) {
      key = `${key}${existingCount + 1}`;
    }
  } else {
    key = key.toUpperCase();
  }

  // Check for duplicate key inside organization
  const existingKey = await Project.findOne({ key, organizationId: payload.orgId });
  if (existingKey) {
    return NextResponse.json({ error: `Project key "${key}" already exists` }, { status: 409 });
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
    key,
    clientName,
    description,
    status,
    members: memberIds,
    logoUrl,
    color,
    createdBy: payload.sub,
    organizationId: payload.orgId
  });


  const populated = await created.populate({
    path: "members",
    select: "firstName lastName avatarUrl"
  });

  return NextResponse.json(
    {
      id: populated._id.toString(),
      name: populated.name,
      key: populated.key,
      clientName: populated.clientName,
      description: populated.description,
      status: populated.status,
      logoUrl: populated.logoUrl,
      color: populated.color,

      members: (populated.members as any[]).map((m) => ({
        id: m._id.toString(),
        name: `${m.firstName} ${m.lastName}`,
        firstName: (m as any).firstName,
        lastName: (m as any).lastName,
        avatarUrl: (m as any).avatarUrl
      }))

    },
    { status: 201 }
  );
}

