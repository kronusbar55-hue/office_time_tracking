import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { LeaveType } from "@/models/LeaveType";
import { cookies } from "next/headers";

export async function GET() {
  try {
    await connectDB();
    const types = await LeaveType.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ data: types });
  } catch (error) {
    console.error("GET /api/leave-types error", error);
    return NextResponse.json({ error: "Failed to fetch leave types" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // only admin
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { code, name, annualQuota = 0, carryForward = false, requiresApproval = true, isActive = true } = body;

    await connectDB();

    const lt = new LeaveType({ code, name, annualQuota, carryForward, requiresApproval, isActive });
    await lt.save();

    return NextResponse.json({ data: lt }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leave-types error", error);
    return NextResponse.json({ error: "Failed to create leave type" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await connectDB();
    const updated = await LeaveType.findByIdAndUpdate(id, updates, { new: true }).lean();
    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("PUT /api/leave-types error", error);
    return NextResponse.json({ error: "Failed to update leave type" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await connectDB();
    await LeaveType.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/leave-types error", error);
    return NextResponse.json({ error: "Failed to delete leave type" }, { status: 500 });
  }
}
