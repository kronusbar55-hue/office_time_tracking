import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { successResp, errorResp } from "@/lib/apiResponse";
import { TimeSession } from "@/models/TimeSession";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { WorkLog } from "@/models/WorkLog";
import { aggregateSessionIntoDailyRecord } from "@/lib/scheduler";

type CheckoutBody = {
  projectId?: string | null;
  workDescription: string;
};

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(errorResp("Invalid content type"), {
        status: 400
      });
    }

    const body = (await request.json().catch(() => null)) as CheckoutBody | null;
    if (!body || typeof body.workDescription !== "string") {
      return NextResponse.json(errorResp("Invalid payload"), { status: 400 });
    }

    const description = body.workDescription.trim();
    if (description.length < 10) {
      return NextResponse.json(
        errorResp("Work description must be at least 10 characters"),
        { status: 400 }
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    // Find active time session for today
    const session = await TimeSession.findOne({
      user: payload.sub,
      date: dateStr,
      status: "active"
    });

    if (!session) {
      return NextResponse.json(
        errorResp("No active session to check out"),
        { status: 409 }
      );
    }

    const now = new Date();
    const clockInTime = new Date(session.clockIn);
    const totalMinutes = Math.round(
      (now.getTime() - clockInTime.getTime()) / 60000
    );
    const breakMinutes = session.totalBreakMinutes || 0;
    const workMinutes = Math.max(0, totalMinutes - breakMinutes);

    // Optional project validation (only if projectId is provided)
    let projectId: string | null = body.projectId ?? null;
    if (projectId) {
      const project = await Project.findOne({
        _id: projectId,
        members: payload.sub
      }).select("_id");

      if (!project) {
        return NextResponse.json(
          errorResp("You are not assigned to this project"),
          { status: 403 }
        );
      }
    }

    // Update session as completed
    session.clockOut = now;
    session.status = "completed";
    session.totalWorkMinutes = workMinutes;
    await session.save();

    // Persist work log linked to this session
    await WorkLog.create({
      user: payload.sub,
      timeSession: session._id,
      project: projectId,
      description,
      workedMinutes: workMinutes,
      breakMinutes,
      date: session.date
    });

    // Update aggregated daily attendance record
    await aggregateSessionIntoDailyRecord(session);

    return NextResponse.json(
      successResp("Checked out and work log saved", {
        sessionId: session._id.toString(),
        workedMinutes: workMinutes,
        breakMinutes,
        projectId,
        date: session.date
      })
    );
  } catch (err: any) {
    console.error("[attendance/checkout] error:", err);
    return NextResponse.json(
      errorResp("Failed to checkout", err?.message || err),
      { status: 500 }
    );
  }
}

