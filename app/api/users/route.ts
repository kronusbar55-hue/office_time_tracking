import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { User } from "@/models/User";
import { Technology } from "@/models/Technology";
import bcrypt from "bcryptjs";
import { getTenantCloudinary } from "@/lib/cloudinary";
import { SUPER_ADMIN_ROLE } from "@/lib/superAdmin";
import crypto from "crypto";
import { successResp, errorResp } from "@/lib/apiResponse";

async function getCurrentUserContext() {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return { payload: null, currentUser: null, tenantAdminId: null };
  }

  if (String(payload.role).toLowerCase() === SUPER_ADMIN_ROLE.toLowerCase()) {
    return { payload, currentUser: null, tenantAdminId: null };
  }

  // Use tenantId from payload if available
  if (payload.tenantId) {
    return { payload, currentUser: null, tenantAdminId: payload.tenantId };
  }

  await connectDB();

  const currentUser = await User.findById(payload.sub)
    .select("_id role tenantId")
    .lean() as any;

  const tenantAdminId =
    String(currentUser?.role).toLowerCase() === "admin"
      ? String(currentUser._id)
      : currentUser?.tenantId
        ? String(currentUser.tenantId)
        : null;

  return { payload, currentUser, tenantAdminId };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const paginate = searchParams.get("paginate") === "true";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "5");
  const skip = (page - 1) * limit;


  const { payload, tenantAdminId } = await getCurrentUserContext();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const query: any = {
    isDeleted: false,
    role: { $nin: [SUPER_ADMIN_ROLE, "super-admin", "SUPER_ADMIN", "superadmin", "SUPERADMIN"] }
  };


  if (String(payload.role).toLowerCase() === "admin") {
    query.$or = [{ _id: payload.sub }, { tenantId: payload.sub }];
  } else if (tenantAdminId) {
    query.$or = [{ tenantId: tenantAdminId }, { tenantId: null }, { tenantId: { $exists: false } }];
  } else if (String(payload.role).toLowerCase() !== SUPER_ADMIN_ROLE.toLowerCase()) {
    query.$or = [{ tenantId: null }, { tenantId: { $exists: false } }];
  }


  if (search) {
    const searchQuery = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchQuery }];
      delete query.$or;
    } else {
      query.$or = searchQuery;
    }
  }

  if (paginate) {
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "technology", select: "name" })
      .lean();

    return NextResponse.json({
      users: users.map((u: any) => ({
        id: u._id.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        department: u.department,
        technology: u.technology
          ? { id: String(u.technology._id || u.technology), name: u.technology.name }
          : null,
        joinDate: u.joinDate,
        avatarUrl: u.avatarUrl,
        isActive: u.isActive
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  }

  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .populate({ path: "technology", select: "name" })
    .lean();

  return NextResponse.json(
    users.map((u: any) => ({
      id: u._id.toString(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      department: u.department,
      technology: u.technology
        ? { id: String(u.technology._id || u.technology), name: u.technology.name }
        : null,
      joinDate: u.joinDate,
      avatarUrl: u.avatarUrl,
      isActive: u.isActive
    }))
  );
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const { payload, tenantAdminId } = await getCurrentUserContext();
    if (!payload) return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    const effectiveTenantId = tenantAdminId || payload.tenantId || payload.sub;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();

      const firstName = String(formData.get("firstName") || "");
      const lastName = String(formData.get("lastName") || "");
      const email = String(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      const role = String(formData.get("role") || "employee");
      const technology = formData.get("technology")
        ? String(formData.get("technology"))
        : undefined;
      const joinDate = formData.get("joinDate")
        ? new Date(String(formData.get("joinDate")))
        : undefined;
      const isActive =
        String(formData.get("isActive") ?? "true").toLowerCase() !== "false";

      if (role === "admin" && payload.role !== SUPER_ADMIN_ROLE) {
        return NextResponse.json(
          errorResp("Only super-admin can create admin accounts"),
          { status: 403 }
        );
      }

      if (!firstName || !lastName || !email || !password) {
        return NextResponse.json(
          errorResp("Missing required fields"),
          { status: 400 }
        );
      }

      const existing = await User.findOne({ email, isDeleted: false }).lean();
      if (existing) {
        return NextResponse.json(
          errorResp("User with this email already exists"),
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);

      let avatarUrl: string | undefined;
      let avatarPublicId: string | undefined;
      let avatarSize: number | undefined;
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
        const cloudinaryInstance = await getTenantCloudinary(effectiveTenantId);
        const res = await cloudinaryInstance.uploader.upload(dataUri, { folder: 'users/profile-images', resource_type: 'image', transformation: { width: 300, height: 300, crop: 'fill' } });
        avatarUrl = res.secure_url;
        avatarPublicId = res.public_id;
        avatarSize = res.bytes;
      }

      const created = await User.create({
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        tenantId: role === "admin" ? undefined : effectiveTenantId,
        technology,
        joinDate,
        isActive,
        avatarUrl,
        avatarPublicId,
        avatarSize
      });

      if (role === "admin" && !created.tenantId) {
        created.tenantId = created._id;
        await created.save();
      }

      const populated = await User.findById(created._id).populate({ path: "technology", select: "name" }).lean();
      return NextResponse.json(successResp("User created", {
        id: created._id.toString(),
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        role: created.role,
        department: created.department,
        technology: (populated as any).technology
          ? { id: String((populated as any).technology._id), name: (populated as any).technology.name }
          : null,
        joinDate: created.joinDate,
        avatarUrl: created.avatarUrl,
        isActive: created.isActive
      }), { status: 201 });
    }

    const body = await request.json();
    const { firstName, lastName, email, password, role, technology, joinDate } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(errorResp("Missing required fields"), { status: 400 });
    }

    const existing = await User.findOne({ email, isDeleted: false }).lean();
    if (existing) {
      return NextResponse.json(errorResp("User with this email already exists"), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role: role || "employee",
      tenantId: (role || "employee") === "admin" ? undefined : effectiveTenantId,
      technology,
      joinDate: joinDate ? new Date(joinDate) : undefined
    });
    if (created.role === "admin" && !created.tenantId) {
      created.tenantId = created._id;
      await created.save();
    }
    const populated = (await User.findById(created._id).populate({ path: "technology", select: "name" }).lean()) as any;

    return NextResponse.json(successResp("User created", {
      id: populated._id.toString(),
      firstName: populated.firstName,
      lastName: populated.lastName,
      email: populated.email,
      role: populated.role,
      department: populated.department,
      technology: populated.technology
        ? { id: String(populated.technology._id), name: populated.technology.name }
        : null,
      joinDate: populated.joinDate,
      avatarUrl: populated.avatarUrl,
      isActive: populated.isActive
    }), { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(errorResp(error instanceof Error ? error.message : "Failed to create user"), { status: 500 });
  }
}

