import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectDB();
        const announcement = await Announcement.findById(params.id)
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

        const announcement = await Announcement.findById(params.id);
        if (!announcement || !announcement.isActive) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        if (isPinned && !announcement.isPinned) {
            const pinnedCount = await Announcement.countDocuments({ isPinned: true, isActive: true });
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
        const cookieStore = cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = verifyAuthToken(token);
        if (!payload || payload.role !== "admin") {
            return NextResponse.json({ error: "Only Admin can delete announcements" }, { status: 403 });
        }

        await connectDB();
        const announcement = await Announcement.findById(params.id);
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
