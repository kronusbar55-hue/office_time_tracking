import { v2 as cloudinary } from "cloudinary";
import { TenantSettings } from "@/models/TenantSettings";
import { connectDB } from "@/lib/db";

/**
 * Configure and return the cloudinary instance based on tenantId.
 * If no tenantId is provided or no settings are found, it falls back to environment variables.
 */
export async function getTenantCloudinary(tenantId?: string | null) {
  await connectDB();
  if (tenantId) {
    const settings = await TenantSettings.findOne({ tenantId });
    if (settings && settings.cloudinary && settings.cloudinary.cloudName && settings.cloudinary.apiKey && settings.cloudinary.apiSecret) {
      cloudinary.config({
        cloud_name: settings.cloudinary.cloudName,
        api_key: settings.cloudinary.apiKey,
        api_secret: settings.cloudinary.apiSecret,
        secure: true,
      });
      return cloudinary;
    }
  }

  // If no tenant-specific settings found, throw error as requested by user
  throw new Error("Please set your Cloudinary credentials in the settings page for image upload");
}

export default cloudinary;
