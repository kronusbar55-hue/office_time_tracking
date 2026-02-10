import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import TaskActivityLog from "@/models/TaskActivityLog";
import { User } from "@/models/User";

interface Params {
  id: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// GET /api/tasks/:id/attachments - Get all attachments for a task
export async function GET(request: Request, { params }: { params: Params }) {
  try {
    await connectDB();

    const task = await Task.findById(params.id)
      .select("attachments")
      .populate({
        path: "attachments.uploadedBy",
        select: "firstName lastName email"
      })
      .lean();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: task.attachments || []
    });
  } catch (error) {
    console.error("Get attachments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/:id/attachments/upload - Upload new attachments
export async function POST(request: Request, { params }: { params: Params }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check permissions - employees can upload, managers/admins can upload and delete
    const canUpload =
      payload.role === "employee" ||
      payload.role === "manager" ||
      payload.role === "admin";
    if (!canUpload) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadedAttachments = [];

    for (const f of files) {
      if (!(f instanceof File) || f.size === 0) {
        continue;
      }

      // Validate file size
      if (f.size > MAX_FILE_SIZE) {
        console.warn(`File ${f.name} exceeds 5MB limit`);
        continue;
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(f.type)) {
        console.warn(`File ${f.name} has unsupported type: ${f.type}`);
        continue;
      }

      try {
        const buffer = Buffer.from(await f.arrayBuffer());
        const base64 = buffer.toString("base64");
        const dataUri = `data:${f.type};base64,${base64}`;

        const res = await cloudinary.uploader.upload(dataUri, {
          folder: `tasks/attachments/${params.id}`,
          resource_type: "auto",
          format: "webp",
          quality: "auto"
        });

        const attachment = {
          url: res.secure_url,
          publicId: res.public_id,
          fileName: f.name,
          fileSize: f.size,
          mimeType: f.type,
          uploadedBy: payload.sub,
          uploadedAt: new Date()
        };

        task.attachments?.push(attachment as any);
        uploadedAttachments.push(attachment);
      } catch (error) {
        console.error(`Cloudinary upload failed for ${f.name}:`, error);
        continue;
      }
    }

    if (uploadedAttachments.length === 0) {
      return NextResponse.json(
        { error: "No files were successfully uploaded" },
        { status: 400 }
      );
    }

    await task.save();

    // Create activity log
    try {
      await TaskActivityLog.create({
        task: params.id,
        user: payload.sub,
        eventType: "IMAGES_ADDED",
        description: `${uploadedAttachments.length} image(s) uploaded`,
        metadata: {
          count: uploadedAttachments.length,
          files: uploadedAttachments.map((a) => a.fileName)
        }
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    return NextResponse.json({
      data: uploadedAttachments
    });
  } catch (error) {
    console.error("Upload attachments error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachments" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/:id/attachments/:publicId - Delete specific attachment
export async function DELETE(request: Request, { params }: { params: Params }) {
  try {
    await connectDB();

    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can delete attachments
    const canDelete =
      payload.role === "manager" || payload.role === "admin";
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
      return NextResponse.json(
        { error: "publicId required" },
        { status: 400 }
      );
    }

    const task = await Task.findById(params.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Find and remove attachment
    const attachmentIndex = task.attachments?.findIndex(
      (a: any) => a.publicId === publicId
    );

    if (attachmentIndex === undefined || attachmentIndex === -1) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const removedAttachment = task.attachments?.[attachmentIndex];

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error("Cloudinary delete failed:", error);
      // Continue anyway - remove from DB
    }

    // Remove from task
    task.attachments?.splice(attachmentIndex, 1);
    await task.save();

    // Create activity log
    try {
      await TaskActivityLog.create({
        task: params.id,
        user: payload.sub,
        eventType: "IMAGES_REMOVED",
        description: `Image removed: ${removedAttachment?.fileName}`,
        metadata: {
          fileName: removedAttachment?.fileName,
          publicId: publicId
        }
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Attachment deleted successfully"
    });
  } catch (error) {
    console.error("Delete attachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
