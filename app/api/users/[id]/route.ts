import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { getTenantCloudinary } from "@/lib/cloudinary";
import crypto from "crypto";
import { successResp, errorResp } from "@/lib/apiResponse";
import { Technology } from "@/models/Technology";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { SUPER_ADMIN_ROLE } from "@/lib/superAdmin";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });

    const scope: any = { _id: params.id, isDeleted: false };
    if (payload.role !== SUPER_ADMIN_ROLE) {
      const tenantAdminId = payload.tenantId || (
        await User.findById(payload.sub).select("_id role tenantId").lean() as any
      )?.tenantId || payload.sub;

      if (payload.role === "admin") {
        scope.$or = [{ _id: payload.sub }, { tenantId: payload.sub }];
      } else {
        scope.tenantId = tenantAdminId;
      }
    }

    const user = await User.findOne(scope).populate({ path: "technology", select: "name" }).lean();
    if (!user) return NextResponse.json(errorResp("User not found"), { status: 404 });

    const u = user as any;
    return NextResponse.json(successResp("User fetched", {
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      technology: u.technology ? { id: String(u.technology._id), name: u.technology.name } : null,
      joinDate: u.joinDate,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive
    }));
  } catch (error) {
    return NextResponse.json(errorResp("Failed to fetch user"), { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });

    const currentUser = payload.role === SUPER_ADMIN_ROLE
      ? null
      : await User.findById(payload.sub).select("_id role tenantId").lean() as any;

    const tenantAdminId = payload.role === SUPER_ADMIN_ROLE
      ? null
      : payload.tenantId || (
        currentUser?.role === "admin"
          ? String(currentUser._id)
          : currentUser?.tenantId
            ? String(currentUser.tenantId)
            : null
      );

    const contentType = request.headers.get("content-type") || "";
    let update: Record<string, unknown> = {};

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      if (formData.has("firstName")) update.firstName = String(formData.get("firstName") || "");
      if (formData.has("lastName")) update.lastName = String(formData.get("lastName") || "");
      if (formData.has("role")) {
        const nextRole = String(formData.get("role") || "employee");
        if (nextRole === "admin" && payload.role !== SUPER_ADMIN_ROLE) {
          return NextResponse.json(errorResp("Only super-admin can assign admin role"), { status: 403 });
        }
        update.role = nextRole;
      }
      if (formData.has("technology")) update.technology = String(formData.get("technology") || "");
      if (formData.has("joinDate")) {
        const jd = formData.get("joinDate");
        update.joinDate = jd ? new Date(String(jd)) : undefined;
      }
      if (formData.has("isActive")) {
        const v = String(formData.get("isActive") || "true").toLowerCase();
        update.isActive = v !== "false";
      }

      const avatarFile = formData.get("avatar");
      if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
        // Validate file size (5MB)
        if (avatarFile.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "Avatar file exceeds 5MB limit" }, { status: 400 });
        }
        // Validate image type
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(avatarFile.type)) {
          return NextResponse.json({ error: "Invalid avatar format. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
        }
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUri = `data:${avatarFile.type};base64,${base64}`;
        const effectiveTenantId = payload.tenantId || payload.sub;
        const cloudinaryInstance = await getTenantCloudinary(effectiveTenantId);
        const res = await cloudinaryInstance.uploader.upload(dataUri, { folder: 'users/profile-images', resource_type: 'image', transformation: { width: 300, height: 300, crop: 'fill' } });
        update.avatarUrl = res.secure_url;
        (update as any).avatarPublicId = res.public_id;
        (update as any).avatarSize = res.bytes;
      }
    } else {
      const body = await request.json();
      const { firstName, lastName, role, joinDate, isActive } = body;
      if (firstName !== undefined) update.firstName = firstName;
      if (lastName !== undefined) update.lastName = lastName;
      if (role !== undefined) {
        if (role === "admin" && payload.role !== SUPER_ADMIN_ROLE) {
          return NextResponse.json(errorResp("Only super-admin can assign admin role"), { status: 403 });
        }
        update.role = role;
      }
      if (body.technology !== undefined) update.technology = body.technology;
      if (joinDate !== undefined) update.joinDate = new Date(joinDate);
      if (isActive !== undefined) update.isActive = isActive;
    }

    const updated = await User.findOneAndUpdate(
      payload.role === SUPER_ADMIN_ROLE
        ? { _id: params.id, isDeleted: false }
        : payload.role === "admin"
          ? { _id: params.id, isDeleted: false, $or: [{ _id: payload.sub }, { tenantId: payload.sub }] }
          : tenantAdminId
            ? { _id: params.id, isDeleted: false, $or: [{ tenantId: tenantAdminId }, { tenantId: null }, { tenantId: { $exists: false } }] }
            : { _id: params.id, isDeleted: false, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) return NextResponse.json(errorResp("User not found"), { status: 404 });

    const populated = (await User.findById((updated as any)._id).populate({ path: "technology", select: "name" }).lean()) as any;

    return NextResponse.json(successResp("User updated", {
      id: populated!._id.toString(),
      firstName: populated!.firstName,
      lastName: populated!.lastName,
      email: populated!.email,
      role: populated!.role,
      technology: populated!.technology ? { id: String(populated!.technology._id), name: populated!.technology.name } : null,
      joinDate: populated!.joinDate,
      avatarUrl: populated!.avatarUrl,
      isActive: populated!.isActive
    }));
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json(errorResp(error instanceof Error ? error.message : "Failed to update user"), { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await connectDB();
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });

    const currentUser = payload.role === SUPER_ADMIN_ROLE
      ? null
      : await User.findById(payload.sub).select("_id role tenantId").lean() as any;

    const tenantAdminId = payload.role === SUPER_ADMIN_ROLE
      ? null
      : payload.tenantId || (
        currentUser?.role === "admin"
          ? String(currentUser._id)
          : currentUser?.tenantId
            ? String(currentUser.tenantId)
            : null
      );

    const deleted = await User.findOneAndUpdate(
      payload.role === SUPER_ADMIN_ROLE
        ? { _id: params.id, isDeleted: false }
        : payload.role === "admin"
          ? { _id: params.id, isDeleted: false, $or: [{ _id: payload.sub }, { tenantId: payload.sub }] }
          : tenantAdminId
            ? { _id: params.id, isDeleted: false, $or: [{ tenantId: tenantAdminId }, { tenantId: null }, { tenantId: { $exists: false } }] }
            : { _id: params.id, isDeleted: false, $or: [{ tenantId: null }, { tenantId: { $exists: false } }] },
      { $set: { isDeleted: true, isActive: false } },
      { new: true }
    ).lean();

    if (!deleted) return NextResponse.json(errorResp("User not found"), { status: 404 });

    return NextResponse.json(successResp("User deleted"));
  } catch (error) {
    return NextResponse.json(errorResp("Failed to delete user"), { status: 500 });
  }
}
