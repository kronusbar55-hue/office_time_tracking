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

type Params = {
  params: {
    id: string;
  };
};

function serializeProject(project: any) {
  return {
    id: project._id.toString(),
    name: project.name,
    key: project.key,
    clientName: project.clientName,
    description: project.description,
    status: project.status,
    logoUrl: project.logoUrl,
    color: project.color,
    members: ((project.members as any[]) || []).map((member) => ({
      id: member._id.toString(),
      name: `${member.firstName} ${member.lastName}`,
      firstName: member.firstName,
      lastName: member.lastName,
      avatarUrl: member.avatarUrl
    }))
  };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });

    const { effectiveTenantId, isSuperAdmin } = await getTenantContext();
    await connectDB();
    const user = (await User.findById(payload.sub).select("role").lean()) as { role?: string } | null;
    if (!user) return NextResponse.json(errorResp("User not found"), { status: 404 });

    const role = String(user.role || "").toLowerCase();
    const query: any = { _id: params.id };
    if (!isSuperAdmin) query.tenantId = effectiveTenantId;
    if (role === "employee") query.members = payload.sub;

    const project = await Project.findOne(query)
      .populate({ path: "members", select: "firstName lastName avatarUrl" })
      .lean();

    if (!project) return NextResponse.json(errorResp("Project not found"), { status: 404 });

    return NextResponse.json(successResp("Project fetched", serializeProject(project)));
  } catch (error) {
    return NextResponse.json(errorResp("Failed to fetch project"), { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
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
      if (formData.has("key"))
        update.key = String(formData.get("key") || "").trim().toUpperCase();

      const memberIds = formData.getAll("memberIds").map((v) => String(v));
      if (memberIds.length) {
        update.members = memberIds;
      }

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
          const base64 = buffer.toString("base64");
          const dataUri = `data:${logo.type};base64,${base64}`;
          const effectiveTenantId = payload.tenantId || payload.sub;
          const cloudinaryInstance = await getTenantCloudinary(effectiveTenantId);
          const res = await cloudinaryInstance.uploader.upload(dataUri, {
            folder: "projects/logos",
            resource_type: "image",
            transformation: { width: 400, height: 400, crop: "limit" }
          });
          update.logoUrl = res.secure_url;
          (update as any).logoPublicId = res.public_id;
          (update as any).logoSize = res.bytes;
        } catch (e) {
          throw e;
        }
      }
    } else {
      const body = (await request.json()) as {
        name?: string;
        key?: string;
        clientName?: string;
        description?: string;
        status?: string;
        memberIds?: string[];
        logoUrl?: string;
      };
      if (body.name !== undefined) update.name = body.name.trim();
      if (body.key !== undefined) update.key = body.key.trim().toUpperCase();
      if (body.clientName !== undefined) update.clientName = body.clientName;
      if (body.description !== undefined) update.description = body.description;
      if (body.status !== undefined) update.status = body.status;
      if (body.memberIds !== undefined) update.members = body.memberIds;
      if (body.logoUrl !== undefined) update.logoUrl = body.logoUrl;
    }

    const projectQuery: any = { _id: params.id };
    if (!isSuperAdmin) projectQuery.tenantId = effectiveTenantId;

    const updated = await Project.findOneAndUpdate(
      projectQuery,
      { $set: update },
      { new: true }
    )
      .populate({
        path: "members",
        select: "firstName lastName avatarUrl"
      })
      .lean();

    if (!updated) {
      return NextResponse.json(errorResp("Project not found"), { status: 404 });
    }

    return NextResponse.json(successResp("Project updated", serializeProject(updated)));
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json(errorResp("Failed to update project", error), { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { effectiveTenantId, isSuperAdmin } = await getTenantContext();
  if (!isSuperAdmin && !effectiveTenantId) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
  }

  await connectDB();
  const user = await User.findById(payload.sub).select("role").lean() as any;
  if (!user || (user.role !== "admin" && user.role !== "hr" && user.role !== "manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

const projectQuery: any = { _id: params.id };
    if (!isSuperAdmin) projectQuery.tenantId = effectiveTenantId;

    const deleted = await Project.findOneAndUpdate(
      projectQuery,
    { $set: { status: "archived" } },
    { new: true }
  ).lean();

  if (!deleted) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
