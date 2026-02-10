import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function DELETE(request: Request, { params }: { params: { publicId: string } }) {
  try {
    const { publicId } = params;
    if (!publicId) return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });

    // destroy (auto resource type)
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
    return NextResponse.json({ data: res });
  } catch (error) {
    console.error('Media delete error', error);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}
