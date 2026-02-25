import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import { verifyAuthToken } from "@/lib/auth";

export async function PATCH(
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
        const announcement = await Announcement.findById(params.id);
        if (!announcement || !announcement.isActive) {
            return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
        }

        const { isPinned } = await req.json();

        if (isPinned && !announcement.isPinned) {
            const pinnedCount = await Announcement.countDocuments({ isPinned: true, isActive: true });
            if (pinnedCount >= 3) {
                return NextResponse.json({ error: "Maximum 3 pinned announcements allowed" }, { status: 400 });
            }
        }

        announcement.isPinned = isPinned;
        await announcement.save();

        return NextResponse.json(announcement);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
