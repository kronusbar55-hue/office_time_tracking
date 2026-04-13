import { NextResponse } from "next/server";
import { getTenantCloudinary } from "@/lib/cloudinary";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function DELETE(request: Request, { params }: { params: { publicId: string } }) {
  try {
    const { publicId } = params;
    if (!publicId) return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cloudinaryInstance = await getTenantCloudinary(payload.tenantId);
    const res = await cloudinaryInstance.uploader.destroy(publicId, { resource_type: 'auto' });
    return NextResponse.json({ data: res });
  } catch (error) {
    console.error('Media delete error', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}
