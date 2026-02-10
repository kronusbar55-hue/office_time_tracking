import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Technology } from "@/models/Technology";

export async function GET(request: Request) {
  await connectDB();

  try {
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    const filter: Record<string, unknown> = {};
    if (!includeInactive) {
      filter.status = "active";
    }

    const list = await Technology.find(filter).sort({ name: 1 }).lean();

    return NextResponse.json(
      list.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        status: t.status,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load technologies" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await connectDB();

  const contentType = request.headers.get("content-type") || "";

  try {
    let name: string | undefined;
    let status: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      name = String(form.get("name") || "").trim();
      status = form.get("status") ? String(form.get("status")) : undefined;
    } else {
      const body = await request.json();
      name = typeof body.name === "string" ? body.name.trim() : undefined;
      status = typeof body.status === "string" ? body.status : undefined;
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await Technology.findOne({ name: { $regex: `^${name}$`, $options: "i" } }).lean();
    if (existing) {
      return NextResponse.json({ error: "Technology with this name already exists" }, { status: 409 });
    }

    const created = await Technology.create({ name, status: status === "inactive" ? "inactive" : "active" });

    return NextResponse.json(
      {
        id: created._id.toString(),
        name: created.name,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not create technology" }, { status: 500 });
  }
}
