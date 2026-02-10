import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { TimeEntry } from "@/models/TimeEntry";
import { Task } from "@/models/Task";

export async function GET(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId") || payload.sub;
  const startParam = url.searchParams.get("startDate");
  const endParam = url.searchParams.get("endDate");

  const now = new Date();
  let start = startParam ? new Date(startParam) : new Date(now);
  if (!startParam) start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  let end = endParam ? new Date(endParam) : new Date(now);
  end.setHours(23, 59, 59, 999);

  // Build aggregation to compute per-day totals and break minutes
  const mongoose = await import("mongoose");
  const userObjectId = mongoose.default.Types.ObjectId.createFromHexString(
    employeeId
  );

  const agg = await TimeEntry.aggregate([
    {
      $match: {
        user: userObjectId,
        clockIn: { $gte: start, $lte: end }
      }
    },
    {
      $addFields: {
        durationMinutes: {
          $cond: [
            { $ifNull: ["$durationMinutes", false] },
            "$durationMinutes",
            {
              $divide: [
                {
                  $cond: [
                    { $ifNull: ["$clockOut", false] },
                    { $subtract: ["$clockOut", "$clockIn"] },
                    { $subtract: [new Date(), "$clockIn"] }
                  ]
                },
                1000 * 60
              ]
            }
          ]
        },
        breakMinutes: {
          $sum: {
            $map: {
              input: { $ifNull: ["$breaks", []] },
              as: "b",
              in: {
                $cond: [
                  { $ifNull: ["$$b.endTime", false] },
                  {
                    $divide: [
                      { $subtract: ["$$b.endTime", "$$b.startTime"] },
                      1000 * 60
                    ]
                  },
                  0
                ]
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$clockIn" } },
        totalWorkMinutes: { $sum: { $subtract: ["$durationMinutes", "$breakMinutes"] } },
        totalBreakMinutes: { $sum: "$breakMinutes" },
        sessions: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]).exec();

  const totals = agg.reduce(
    (acc, e) => {
      acc.totalWorkMinutes += e.totalWorkMinutes;
      acc.totalBreakMinutes += e.totalBreakMinutes;
      acc.sessions += e.sessions;
      acc.presentDays += e.totalWorkMinutes > 0 ? 1 : 0;
      return acc;
    },
    { totalWorkMinutes: 0, totalBreakMinutes: 0, sessions: 0, presentDays: 0 }
  );

  return NextResponse.json({
    range: { start, end },
    totals: {
      totalWorkMinutes: Math.round(totals.totalWorkMinutes),
      totalBreakMinutes: Math.round(totals.totalBreakMinutes),
      sessions: totals.sessions,
      presentDays: totals.presentDays
    },
    byDay: agg.map((e) => ({ date: e._id as string, totalWorkMinutes: Math.round(e.totalWorkMinutes), totalBreakMinutes: Math.round(e.totalBreakMinutes) }))
  });
}

