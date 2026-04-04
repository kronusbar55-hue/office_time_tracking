import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import cloudinary from "@/lib/cloudinary";
import { requireActiveOrganization, requireAuth, requireRole } from "@/lib/authz";
import { normalizeRoleInput } from "@/lib/roles";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const ctx = await requireAuth();
  await requireActiveOrganization(ctx);

  await connectDB();
  const query: any = { _id: params.id, isDeleted: false };
  if (ctx.token.role !== "SUPER_ADMIN") {
    query.organizationId = ctx.token.orgId;
  }
  
  const user = await User.findOne(query).populate({ path: "technology", select: "name" }).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const u = user as any;
  return NextResponse.json({
    id: u._id.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    technology: u.technology ? { id: String(u.technology._id || u.technology), name: u.technology.name } : null,
    joinDate: u.joinDate,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive
  });
}

export async function PUT(request: Request, { params }: Params) {
  const ctx = await requireAuth();
  await requireActiveOrganization(ctx);
  requireRole(ctx, ["admin", "hr", "SUPER_ADMIN"]);

  await connectDB();
  const query: any = { _id: params.id, isDeleted: false };
  if (ctx.token.role !== "SUPER_ADMIN") {
    query.organizationId = ctx.token.orgId;
  }

  const contentType = request.headers.get("content-type") || "";
  let update: Record<string, any> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    if (formData.has("firstName")) update.firstName = String(formData.get("firstName"));
    if (formData.has("lastName")) update.lastName = String(formData.get("lastName"));
    if (formData.has("role")) update.role = normalizeRoleInput(String(formData.get("role"))) || undefined;
    if (formData.has("technology")) update.technology = String(formData.get("technology"));
    if (formData.has("joinDate")) update.joinDate = new Date(String(formData.get("joinDate")));
    if (formData.has("isActive")) update.isActive = String(formData.get("isActive")) !== "false";

    const avatarFile = formData.get("avatar");
    if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
      const buffer = Buffer.from(await avatarFile.arrayBuffer());
      const base64 = buffer.toString('base64');
      const res = await cloudinary.uploader.upload(`data:${avatarFile.type};base64,${base64}`, { folder: 'users/profile-images' });
      update.avatarUrl = res.secure_url;
    }
  } else {
    const body = await request.json();
    Object.assign(update, body);
    if (body.role) {
      update.role = normalizeRoleInput(body.role) || undefined;
    }
    if (body.email) {
      update.email = String(body.email).toLowerCase();
    }
  }

  if (update.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "SUPER_ADMIN cannot belong to an organization" }, { status: 400 });
  }

  const updated = await User.findOneAndUpdate(query, { $set: update }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const populated = (await User.findById((updated as any)._id).populate("technology").lean()) as any;
  return NextResponse.json({
    id: populated._id.toString(),
    firstName: populated.firstName,
    lastName: populated.lastName,
    email: populated.email,
    role: populated.role,
    isActive: populated.isActive
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await requireAuth();
  await requireActiveOrganization(ctx);
  requireRole(ctx, ["admin", "hr", "SUPER_ADMIN"]);

  await connectDB();
  const query: any = { _id: params.id, isDeleted: false };
  if (ctx.token.role !== "SUPER_ADMIN") {
    query.organizationId = ctx.token.orgId;
  }

  const deleted = await User.findOneAndUpdate(query, { $set: { isDeleted: true, isActive: false } }, { new: true }).lean();
  if (!deleted) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
