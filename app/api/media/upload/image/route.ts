import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import cloudinary from "@/lib/cloudinary";

export async function POST(request: Request) {
  try {
    await connectDB();
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });

    const fd = await request.formData();
    const files = fd.getAll('file');
    const uploaded: any[] = [];

    for (const f of files) {
      if (f && f instanceof File && f.size > 0) {
        const buffer = Buffer.from(await f.arrayBuffer());
        const base64 = buffer.toString('base64');
        const dataUri = `data:${f.type};base64,${base64}`;
        const res = await cloudinary.uploader.upload(dataUri, { folder: 'uploads/images', resource_type: 'image' });
        uploaded.push({ url: res.secure_url, publicId: res.public_id, format: res.format, bytes: res.bytes });
      }
    }

    return NextResponse.json({ data: uploaded });
  } catch (error) {
    console.error('Media upload error', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
