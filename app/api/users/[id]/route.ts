import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import cloudinary from "@/lib/cloudinary";
import { Technology } from "@/models/Technology";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  await connectDB();
  const user = await User.findOne({ _id: params.id, isDeleted: false }).populate({ path: "technology", select: "name" }).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    technology: user.technology ? { id: String(user.technology._id || user.technology), name: (user as any).technology.name } : null,
    joinDate: user.joinDate,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive
  });
}

export async function PUT(request: Request, { params }: Params) {
  await connectDB();

  const contentType = request.headers.get("content-type") || "";

  let update: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    if (formData.has("firstName")) {
      update.firstName = String(formData.get("firstName") || "");
    }
    if (formData.has("lastName")) {
      update.lastName = String(formData.get("lastName") || "");
    }
    if (formData.has("role")) {
      update.role = String(formData.get("role") || "employee");
    }
    if (formData.has("technology")) {
      update.technology = String(formData.get("technology") || "");
    }
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
      try {
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUri = `data:${avatarFile.type};base64,${base64}`;
        const res = await cloudinary.uploader.upload(dataUri, { folder: 'users/profile-images', resource_type: 'image', transformation: { width: 300, height: 300, crop: 'fill' } });
        update.avatarUrl = res.secure_url;
        (update as any).avatarPublicId = res.public_id;
        (update as any).avatarSize = res.bytes;
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
        update.avatarUrl = `/uploads/${fileName}`;
      }
    }
  } else {
    const body = await request.json();
    const {
      firstName,
      lastName,
      role,
      department,
      joinDate,
      isActive
    } = body;

    if (firstName !== undefined) update.firstName = firstName;
    if (lastName !== undefined) update.lastName = lastName;
    if (role !== undefined) update.role = role;
    if (body.technology !== undefined) update.technology = body.technology;
    if (joinDate !== undefined) update.joinDate = new Date(joinDate);
    if (isActive !== undefined) update.isActive = isActive;
  }

  const updated = await User.findOneAndUpdate(
    { _id: params.id, isDeleted: false },
    { $set: update },
    { new: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // populate technology for response
  const populated = await User.findById(updated._id).populate({ path: "technology", select: "name" }).lean();

  return NextResponse.json({
    id: populated!._id.toString(),
    firstName: populated!.firstName,
    lastName: populated!.lastName,
    email: populated!.email,
    role: populated!.role,
    technology: populated!.technology ? { id: String((populated! as any).technology._id || (populated! as any).technology), name: (populated! as any).technology.name } : null,
    joinDate: populated!.joinDate,
    avatarUrl: populated!.avatarUrl,
    isActive: populated!.isActive
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  await connectDB();

  const deleted = await User.findOneAndUpdate(
    { _id: params.id, isDeleted: false },
    { $set: { isDeleted: true, isActive: false } },
    { new: true }
  ).lean();

  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

