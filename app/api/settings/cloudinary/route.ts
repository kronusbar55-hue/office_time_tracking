import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { TenantSettings } from "@/models/TenantSettings";
import { getServerUser } from "@/lib/getServerUser";
import { successResp, errorResp } from "@/lib/apiResponse";

export async function GET() {
  try {
    await connectDB();
    const user = await getServerUser();

    if (!user || (user.role !== "admin" && user.role !== "super-admin")) {
      return NextResponse.json(errorResp("Unauthorized"), { status: 401 });
    }

    // Fallback to user ID if tenantId is missing from session (specifically for admins)
    const effectiveTenantId = user.tenantId || user.sub;

    if (!effectiveTenantId) {
       return NextResponse.json(errorResp("Tenant not found"), { status: 404 });
    }

    const settings = await TenantSettings.findOne({ tenantId: effectiveTenantId });

    if (!settings) {
      return NextResponse.json(successResp("Settings not found", { cloudinary: { cloudName: "", apiKey: "", apiSecret: "" } }));
    }

    return NextResponse.json(successResp("Settings fetched", settings));
  } catch (error) {
    console.error("Fetch cloudinary settings error:", error);
    return NextResponse.json(errorResp("Failed to fetch settings"), { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const user = await getServerUser();

    if (!user || user.role !== "admin") {
      return NextResponse.json(errorResp("Unauthorized: Only admins can manage settings"), { status: 401 });
    }

    // Fallback to user ID if tenantId is missing from session (specifically for admins)
    const effectiveTenantId = user.tenantId || user.sub;

    if (!effectiveTenantId) {
       return NextResponse.json(errorResp("Tenant not found"), { status: 404 });
    }

    const body = await request.json();
    const { cloudName, apiKey, apiSecret } = body;

    if (!cloudName || !apiKey || !apiSecret) {
         return NextResponse.json(errorResp("Missing required fields"), { status: 400 });
    }

    const settings = await TenantSettings.findOneAndUpdate(
      { tenantId: effectiveTenantId },
      {
        $set: {
          "cloudinary.cloudName": cloudName,
          "cloudinary.apiKey": apiKey,
          "cloudinary.apiSecret": apiSecret,
          updatedBy: user.sub,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json(successResp("Cloudinary settings updated", settings));
  } catch (error) {
    console.error("Update cloudinary settings error:", error);
    return NextResponse.json(errorResp("Failed to update settings"), { status: 500 });
  }
}
