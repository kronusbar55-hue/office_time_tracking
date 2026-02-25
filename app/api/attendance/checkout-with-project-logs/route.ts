import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { successResp, errorResp } from "@/lib/apiResponse";
import { TimeSession } from "@/models/TimeSession";
import { Project } from "@/models/Project";
import { WorkLog } from "@/models/WorkLog";
import { aggregateSessionIntoDailyRecord } from "@/lib/scheduler";
import CheckInOut from "@/models/CheckInOut";

type ProjectLogPayload = {
  projectId: string;
  description: string;
  workedMinutes: number;
};

type CheckoutWithLogsBody = {
  attendanceId?: string | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
  projectLogs: ProjectLogPayload[];
  generalNotes?: string | null;
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

    const body = (await request.json().catch(() => null)) as CheckoutWithLogsBody | null;
    if (!body || !Array.isArray(body.projectLogs)) {
      return NextResponse.json(errorResp("Invalid payload"), { status: 400 });
    }

    const generalNotes = (body.generalNotes || "").trim();
    const projectLogs = body.projectLogs
      .map((pl) => ({
        projectId: String(pl.projectId || ""),
        description: String(pl.description || "").trim(),
        workedMinutes: Number(pl.workedMinutes || 0)
      }))
      .filter((pl) => pl.projectId && pl.description.length >= 3 && pl.workedMinutes > 0);

    if (projectLogs.length === 0) {
      return NextResponse.json(
        errorResp("At least one valid project log is required"),
        { status: 400 }
      );
    }

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

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

    // Validate that all projects belong to the user
    const projectIds = projectLogs.map((pl) => pl.projectId);
    const distinctProjectIds = Array.from(new Set(projectIds));

    const allowedProjects = await Project.find({
      _id: { $in: distinctProjectIds },
      members: payload.sub
    })
      .select({ _id: 1 })
      .lean();

    const allowedIds = new Set(allowedProjects.map((p) => p._id.toString()));
    const unauthorized = distinctProjectIds.filter((id) => !allowedIds.has(id));
    if (unauthorized.length > 0) {
      return NextResponse.json(
        errorResp("You can only log work for assigned projects"),
        { status: 403 }
      );
    }

    // Finalize the time session
    session.clockOut = now;
    session.status = "completed";
    session.totalWorkMinutes = workMinutes;
    if (generalNotes) {
      (session as any).notes = generalNotes;
    }
    await session.save();

    const perLogBreakMinutes =
      projectLogs.length > 0 ? Math.round(breakMinutes / projectLogs.length) : 0;

    await WorkLog.insertMany(
      projectLogs.map((pl) => ({
        user: payload.sub,
        timeSession: session._id,
        project: pl.projectId,
        description: pl.description,
        workedMinutes: pl.workedMinutes,
        breakMinutes: perLogBreakMinutes,
        date: session.date
      }))
    );

    await aggregateSessionIntoDailyRecord(session);

    // Attach general notes at daily attendance level as well
    if (generalNotes) {
      await CheckInOut.findOneAndUpdate(
        { user: payload.sub, date: session.date },
        { $set: { notes: generalNotes } }
      );
    }

    return NextResponse.json(
      successResp("Checked out with project-wise logs saved", {
        sessionId: session._id.toString(),
        workedMinutes: workMinutes,
        breakMinutes,
        totalProjects: projectLogs.length,
        date: session.date
      })
    );
  } catch (err: any) {
    console.error("[attendance/checkout-with-project-logs] error:", err);
    return NextResponse.json(
      errorResp("Failed to checkout with project logs", err?.message || err),
      { status: 500 }
    );
  }
}

