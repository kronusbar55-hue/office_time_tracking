import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { CheckInOut } from "@/models/CheckInOut";
import { User } from "@/models/User";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * GET /api/checkin-checkout/list
 * Get list of check-in/check-out records with pagination and filters
 */
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const role = searchParams.get("role");
    const userId = searchParams.get("userId");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Get current user
    const currentUser = await User.findById(payload.sub).lean();
    if (!currentUser) {
      return NextResponse.json(errorResp("User not found"), { status: 404 });
    }

    // Build query based on user role
    let query: any = {};

    // Role-based access control
    if (currentUser.role === "employee") {
      query.user = payload.sub;
    } else if (currentUser.role === "manager") {
      // Managers can see their team's records
      const teamMembers = await User.find({ manager: payload.sub }).select("_id");
      const teamIds = teamMembers.map((m) => m._id);
      query.$or = [{ user: payload.sub }, { user: { $in: teamIds } }];
    } else if ((currentUser.role as string) === "hr" || (currentUser.role as string) === "admin") {
      // HR and admin can see all records
      if (userId) {
        query.user = userId;
      }
      if (role) {
        query.userRole = role;
      }
    }

    // Date range filter
    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    // Get total count
    const total = await CheckInOut.countDocuments(query);

    // Get records with sorting
    const sortObj: any = {};
    sortObj[sortBy === "date" ? "date" : sortBy] = sortOrder === "desc" ? -1 : 1;

    const records = await CheckInOut.find(query)
      .populate("user", "firstName lastName email role avatarUrl")
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const pages = Math.ceil(total / limit);

    return NextResponse.json(
      successResp("Records retrieved successfully", {
        data: records,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      })
    );
  } catch (err: any) {
    console.error("[checkin-checkout/list] error:", err);
    return NextResponse.json(
      errorResp("Failed to get records", err?.message),
      { status: 500 }
    );
  }
}
