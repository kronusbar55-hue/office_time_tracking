import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeLog } from "@/models/IssueCollaboration";
import { Task } from "@/models/Task";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      issueId: string;
      timeSpentMinutes: number;
      description?: string;
      isBillable?: boolean;
      loggedDate?: Date;
    };

    if (!body.issueId || !body.timeSpentMinutes || body.timeSpentMinutes <= 0) {
      return NextResponse.json(
        errorResp("Missing or invalid required fields"),
        { status: 400 }
      );
    }

    // Verify issue exists
    const task = await Task.findById(body.issueId);
    if (!task) {
      return NextResponse.json(
        errorResp("Issue not found"),
        { status: 404 }
      );
    }

    const timeLog = await TimeLog.create({
      issue: body.issueId,
      loggedBy: payload.sub,
      startTime: new Date(),
      endTime: new Date(new Date().getTime() + body.timeSpentMinutes * 60000),
      timeSpentMinutes: body.timeSpentMinutes,
      description: body.description || "",
      isBillable: body.isBillable || false,
      loggedDate: body.loggedDate ? new Date(body.loggedDate) : new Date()
    });

    // Update task totalTimeSpent
    task.totalTimeSpent = (task.totalTimeSpent || 0) + body.timeSpentMinutes;
    await task.save();

    return NextResponse.json(
      successResp("Time log created", {
        id: timeLog._id.toString(),
        timeSpent: body.timeSpentMinutes,
        isBillable: body.isBillable || false
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/issues/time-logs/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create time log", err?.message || err),
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issueId");

    if (!issueId) {
      return NextResponse.json(
        errorResp("Missing issue ID"),
        { status: 400 }
      );
    }

    const timeLogs = await TimeLog.find({
      issue: issueId
    })
      .populate("loggedBy", "firstName lastName")
      .sort({ loggedDate: -1 })
      .lean();

    const totalTime = timeLogs.reduce((acc: number, log: any) => acc + log.timeSpentMinutes, 0);
    const totalBillable = timeLogs
      .filter((log: any) => log.isBillable)
      .reduce((acc: number, log: any) => acc + log.timeSpentMinutes, 0);

    return NextResponse.json(
      successResp("Time logs retrieved", {
        timeLogs: timeLogs.map((log: any) => ({
          id: log._id.toString(),
          timeSpent: log.timeSpentMinutes,
          isBillable: log.isBillable,
          description: log.description,
          loggedBy: log.loggedBy,
          loggedDate: log.loggedDate
        })),
        summary: {
          totalMinutes: totalTime,
          totalBillableMinutes: totalBillable,
          totalHours: Math.round(totalTime / 60 * 10) / 10
        }
      })
    );
  } catch (err: any) {
    console.error("[jira/issues/time-logs/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve time logs", err?.message || err),
      { status: 500 }
    );
  }
}
