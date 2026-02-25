import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const sort = searchParams.get("sort") || "latest";

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

        // Filter out expired announcements
        andConditions.push({
            $or: [
                { expiresAt: { $exists: false } },
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });

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
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = verifyAuthToken(token);
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
            const pinnedCount = await Announcement.countDocuments({ isPinned: true, isActive: true });
            if (pinnedCount >= 3) {
                return NextResponse.json({ error: "Maximum 3 pinned announcements allowed" }, { status: 400 });
            }
        }

        const announcement = await Announcement.create({
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
