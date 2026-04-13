import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { getTenantContext } from "@/lib/tenantContext";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { getTenantCloudinary } from "@/lib/cloudinary";
import crypto from "crypto";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { effectiveTenantId, isSuperAdmin } = await getTenantContext();
  const userId = payload.sub;
  await connectDB();
  const userRecord = await User.findById(userId).select("role").lean() as any;
  if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 401 });

  const userRole = String(userRecord.role || "").toLowerCase();
  // console.log("userRole", userRole);
  const isAdminOrHR = userRole === "admin" || userRole === "hr";
  const canManage = isAdminOrHR || userRole === "manager";

  const url = new URL(request.url);
  const forCurrentUser = url.searchParams.get("forCurrentUser") === "true";

  const query: Record<string, any> = {
    status: { $ne: "archived" },
    name: { $nin: ["Other", "other", "OTHER"] }
  };

  if (!isSuperAdmin) {
    query.tenantId = effectiveTenantId;
  }

  // Enforce filtering for managers and employees
  // Admins and HR still see tenant-scoped projects unless they explicitly request forCurrentUser
  if ((forCurrentUser && userRole === "admin") || userRole === "employee" || userRole === "manager") {
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
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

      if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    const { effectiveTenantId, isSuperAdmin } = await getTenantContext();
    await connectDB();
    const user = await User.findById(payload.sub).select("_id role tenantId").lean() as any;
    if (!user || (user.role !== "admin" && user.role !== "hr" && user.role !== "manager")) {
      return NextResponse.json(errorResp("Forbidden"), { status: 403 });
    }

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
          // Validate file size (5MB)
          if (logo.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "Logo file exceeds 5MB limit" }, { status: 400 });
          }
          // Validate image type
          const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
          if (!allowedTypes.includes(logo.type)) {
            return NextResponse.json({ error: "Invalid logo type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
          }

          try {
            const buffer = Buffer.from(await logo.arrayBuffer());
            const base64 = buffer.toString('base64');
            const dataUri = `data:${logo.type};base64,${base64}`;
            const cloudinaryInstance = await getTenantCloudinary(effectiveTenantId);
            const res = await cloudinaryInstance.uploader.upload(dataUri, { folder: 'projects/logos', resource_type: 'image', transformation: { width: 400, height: 400, crop: 'limit' } });
            logoUrl = res.secure_url;
          } catch (e) {
            // Re-throw to hit main catch
            throw e;
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


    if (!name) {
      return NextResponse.json(
        errorResp("Project name is required"),
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
      const countQuery: any = { key: new RegExp(`^${key}`) };
      if (!isSuperAdmin) countQuery.tenantId = effectiveTenantId;
      const existingCount = await Project.countDocuments(countQuery);
      if (existingCount > 0) {
        key = `${key}${existingCount + 1}`;
      }
    } else {
      key = key.toUpperCase();
    }

    // Check for duplicate key
    const keyQuery: any = { key, isDeleted: { $ne: true } };
    if (!isSuperAdmin) keyQuery.tenantId = effectiveTenantId;
    const existingKey = await Project.findOne(keyQuery);
    if (existingKey) {
      return NextResponse.json(errorResp(`Project key "${key}" already exists`), { status: 409 });
    }

    const colors = ["#4F46E5", "#22C55E", "#F97316", "#EC4899", "#06B6D4"];
    const color =
      colors[
      Math.abs(
        name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      ) % colors.length
      ];

    const created = await Project.create({
      tenantId: effectiveTenantId,
      name,
      key,
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
      successResp("Project created", {
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
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Project creation error:", error);
    return NextResponse.json(errorResp(error instanceof Error ? error.message : "Failed to create project"), { status: 500 });
  }
}

