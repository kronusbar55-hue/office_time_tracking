import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Technology } from "@/models/Technology";
import bcrypt from "bcryptjs";
import cloudinary from "@/lib/cloudinary";

export async function GET() {
  await connectDB();

  const users = await User.find({ isDeleted: false })
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
  await connectDB();

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

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email, isDeleted: false }).lean();
    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let avatarUrl: string | undefined;
    let avatarPublicId: string | undefined;
    let avatarSize: number | undefined;
    const avatarFile = formData.get("avatar");
    if (avatarFile && avatarFile instanceof File && avatarFile.size > 0) {
      try {
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUri = `data:${avatarFile.type};base64,${base64}`;
        const res = await cloudinary.uploader.upload(dataUri, { folder: 'users/profile-images', resource_type: 'image', transformation: { width: 300, height: 300, crop: 'fill' } });
        avatarUrl = res.secure_url;
        avatarPublicId = res.public_id;
        avatarSize = res.bytes;
      } catch (e) {
        console.warn('Cloudinary avatar upload failed, falling back to local save', e);
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        const ext = avatarFile.name.split('.').pop() || 'png';
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const { writeFile, mkdir } = await import('fs/promises');
        const path = (await import('path')).default;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        avatarUrl = `/uploads/${fileName}`;
      }
    }

    const created = await User.create({
      firstName,
      lastName,
      email,
      passwordHash,
      role,
      technology,
      joinDate,
      isActive,
      avatarUrl,
      avatarPublicId,
      avatarSize
    });

    return NextResponse.json(
      {
        id: created._id.toString(),
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        role: created.role,
        technology: created.technology ? String(created.technology) : null,
        joinDate: created.joinDate,
        avatarUrl: created.avatarUrl,
        isActive: created.isActive
      },
      { status: 201 }
    );
  }

  const body = await request.json();
  const { firstName, lastName, email, password, role, technology, joinDate } =
    body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const existing = await User.findOne({ email, isDeleted: false }).lean();
  if (existing) {
    return NextResponse.json(
      { error: "User with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    role: role || "employee",
    technology,
    joinDate: joinDate ? new Date(joinDate) : undefined
  });
  // populate technology for response
  const populated = await User.findById(created._id).populate({ path: "technology", select: "name" }).lean();

  return NextResponse.json(
    {
      id: populated!._id.toString(),
      firstName: populated!.firstName,
      lastName: populated!.lastName,
      email: populated!.email,
      role: populated!.role,
      technology: populated!.technology
        ? {
            id: String(
              (populated!.technology as any)._id || populated!.technology
            ),
            name: (populated!.technology as any).name
          }
        : null,
      joinDate: populated!.joinDate,
      avatarUrl: populated!.avatarUrl,
      isActive: populated!.isActive
    },
    { status: 201 }
  );
}

