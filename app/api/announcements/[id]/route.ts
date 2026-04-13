import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { getTenantContext } from "@/lib/tenantContext";

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
    const { payload, effectiveTenantId, isSuperAdmin } = await getTenantContext();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const findQuery: any = { _id: params.id };
    if (!isSuperAdmin) findQuery.tenantId = effectiveTenantId;

    const announcement = await Announcement.findOne(findQuery)
      .populate("createdBy", "firstName lastName avatarUrl")
      .lean();

        if (!announcement || !announcement.isActive) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        return NextResponse.json(announcement);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { payload, effectiveTenantId, isSuperAdmin } = await getTenantContext();
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (payload.role !== "admin" && payload.role !== "hr") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { title, description, category, isPinned, expiresAt } = body;

        const announcement = await Announcement.findOne({
            _id: params.id,
            ...(isSuperAdmin ? {} : { tenantId: effectiveTenantId })
        });
        if (!announcement || !announcement.isActive) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        if (isPinned && !announcement.isPinned) {
            const pinnedCountQuery: any = { isPinned: true, isActive: true };
            if (!isSuperAdmin) pinnedCountQuery.tenantId = effectiveTenantId;
            const pinnedCount = await Announcement.countDocuments(pinnedCountQuery);
            if (pinnedCount >= 3) {
                return NextResponse.json({ error: "Maximum 3 pinned announcements allowed" }, { status: 400 });
            }
        }

        announcement.title = title ?? announcement.title;
        announcement.description = description ?? announcement.description;
        announcement.category = category ?? announcement.category;
        announcement.isPinned = isPinned ?? announcement.isPinned;
        announcement.expiresAt = expiresAt ? new Date(expiresAt) : announcement.expiresAt;

        await announcement.save();

        return NextResponse.json(announcement);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const { payload, effectiveTenantId, isSuperAdmin } = await getTenantContext();
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (payload.role !== "admin") {
            return NextResponse.json({ error: "Only Admin can delete announcements" }, { status: 403 });
        }

        const announcement = await Announcement.findOne({
            _id: params.id,
            ...(isSuperAdmin ? {} : { tenantId: effectiveTenantId })
        });
        if (!announcement) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        announcement.isActive = false; // Soft delete
        await announcement.save();

        return NextResponse.json({ message: "Announcement deleted successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
