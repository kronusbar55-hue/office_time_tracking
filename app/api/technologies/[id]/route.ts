import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Technology } from "@/models/Technology";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  await connectDB();

  const tech = await Technology.findById(params.id).lean();
  if (!tech) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: tech._id.toString(),
    name: tech.name,
    status: tech.status,
    createdAt: tech.createdAt,
    updatedAt: tech.updatedAt
  });
}

export async function PUT(request: Request, { params }: Params) {
  await connectDB();

  const contentType = request.headers.get("content-type") || "";

  try {
    let name: string | undefined;
    let status: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      if (form.has("name")) name = String(form.get("name") || "").trim();
      if (form.has("status")) status = String(form.get("status") || "");
    } else {
      const body = await request.json();
      if (body.name !== undefined) name = String(body.name).trim();
      if (body.status !== undefined) status = String(body.status);
    }

    const update: Record<string, unknown> = {};
    if (name) update.name = name;
    if (status === "active" || status === "inactive") update.status = status;

    // If name is changing, ensure uniqueness
    if (name) {
      const existing = await Technology.findOne({
        _id: { $ne: params.id },
        name: { $regex: `^${name}$`, $options: "i" }
      }).lean();
      if (existing) {
        return NextResponse.json({ error: "Technology with this name already exists" }, { status: 409 });
      }
    }

    const updated = await Technology.findByIdAndUpdate(params.id, { $set: update }, { new: true }).lean();
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: updated._id.toString(),
      name: updated.name,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not update technology" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  await connectDB();

  // Soft-delete by setting status to inactive
  const updated = await Technology.findByIdAndUpdate(params.id, { $set: { status: "inactive" } }, { new: true }).lean();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
