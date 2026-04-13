import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { verifyAuthToken } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenantContext";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDB();
    const { payload, effectiveTenantId, isSuperAdmin } = await getTenantContext();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const sort = searchParams.get("sort") || "latest";
        const expiryFilter = searchParams.get("expiryFilter") || "all";

        const query: any = { isActive: true };

        if (category && category !== "All") {
            query.category = category;
        }

        const andConditions: any[] = [];

        if (search) {
            andConditions.push({
                $or: [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } }
                ]
            });
        }

        // Handle expiry filter
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        if (expiryFilter === "active") {
            // Only show active (non-expired) announcements
            andConditions.push({
                $or: [
                    { expiresAt: { $exists: false } },
                    { expiresAt: null },
                    { expiresAt: { $gt: now } }
                ]
            });
        } else if (expiryFilter === "expiring-soon") {
            // Show announcements expiring within 7 days
            andConditions.push({
                expiresAt: { $lte: sevenDaysFromNow, $gt: now }
            });
        } else if (expiryFilter === "expired") {
            // Show only expired announcements
            andConditions.push({
                expiresAt: { $lte: now }
            });
        } else {
            // "all" - show all announcements (don't filter by expiry)
            // No additional conditions needed
        }

        if (!isSuperAdmin) {
            query.tenantId = effectiveTenantId;
        }

        if (andConditions.length > 0) {
            query.$and = andConditions;
        }

        let sortOption: any = { isPinned: -1, createdAt: -1 };

        if (sort === "oldest") {
            sortOption = { isPinned: -1, createdAt: 1 };
        }

        const announcements = await Announcement.find(query)
            .sort(sortOption)
            .populate({
                path: "createdBy",
                select: "firstName lastName avatarUrl",
                populate: { path: "technology", select: "name" }
            })
            .lean();


        return NextResponse.json(announcements);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { payload, effectiveTenantId, isSuperAdmin } = await getTenantContext();
        if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!payload || (payload.role !== "admin" && payload.role !== "hr")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const body = await req.json();

        const { title, description, category, isPinned, expiresAt } = body;

        if (!title || !description) {
            return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
        }

        if (isPinned) {
            const pinnedCountQuery: any = { isPinned: true, isActive: true };
            if (!isSuperAdmin) pinnedCountQuery.tenantId = effectiveTenantId;
            const pinnedCount = await Announcement.countDocuments(pinnedCountQuery);
            if (pinnedCount >= 3) {
                return NextResponse.json({ error: "Maximum 3 pinned announcements allowed" }, { status: 400 });
            }
        }

        const announcement = await Announcement.create({
            tenantId: effectiveTenantId,
            title,
            description,
            category,
            isPinned,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdBy: payload.sub,
            isActive: true
        });

        return NextResponse.json(announcement, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
