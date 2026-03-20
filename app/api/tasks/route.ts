import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { TaskCounter } from "@/models/TaskCounter";
import TaskActivityLog from "@/models/TaskActivityLog";
import { verifyAuthToken } from "@/lib/auth";
import { captureAuditLogs } from "@/lib/taskAudit";
import cloudinary from "@/lib/cloudinary";
import { Comment } from "@/models/Comment";
import SubTask from "@/models/SubTask";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const project = searchParams.get("project");
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search")?.toLowerCase() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const query: any = { isDeleted: false };

    // authorization: require auth token and apply role-aware filters
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = payload.sub;
    const role = payload.role;

    // Role-based visibility
    if (role === "admin" || role === "hr") {
      // admin and hr can see all (hr is view-only at API-level)
    } else if (role === "manager") {
      // Find projects where manager is a member
      const projects = await Project.find({ members: userId }).select("_id").lean();
      const projectIds = projects.map((p: any) => p._id);

      // manager: tasks in their projects OR tasks they reported OR tasks assigned to their team
      const team = await User.find({ manager: userId, isDeleted: false }).select("_id").lean();
      const teamIds = team.map((t: any) => t._id.toString());
      
      query.$or = [
        { project: { $in: projectIds } },
        { reporter: userId },
        { assignee: { $in: teamIds } }
      ];
    } else {
      // employee: only tasks assigned to them
      query.assignee = userId;
    }

    if (project) query.project = project;
    if (status) query.status = status;
    if (assignee) query.assignee = assignee;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { key: { $regex: search, $options: "i" } }
      ];
    }

    const total = await Task.countDocuments(query);

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "project", select: "name" })
      .populate({ path: "assignee", select: "firstName lastName email" })
      .populate({ path: "reporter", select: "firstName lastName email" })
      .lean();

    // Augment with comment counts
    const taskIds = tasks.map(t => t._id);
    const commentCounts = await Comment.aggregate([
      { $match: { taskId: { $in: taskIds } } },
      { $group: { _id: "$taskId", count: { $sum: 1 } } }
    ]);
    const countsMap = new Map(commentCounts.map(c => [c._id.toString(), c.count]));

    // Augment with subtask stats
    const subtaskStats = await SubTask.aggregate([
      { $match: { parentTask: { $in: taskIds }, isDeleted: false } },
      { $group: { 
          _id: "$parentTask", 
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } }
      } }
    ]);
    const subtaskStatsMap = new Map(subtaskStats.map(s => [s._id.toString(), { total: s.total, done: s.done }]));

    const augmentedTasks = tasks.map(t => {
      const sStats = subtaskStatsMap.get(t._id.toString()) || { total: 0, done: 0 };
      return {
        ...t,
        commentCount: countsMap.get(t._id.toString()) || 0,
        attachmentCount: t.attachments?.length || 0,
        subtaskStats: sStats
      };
    });

    // Optional grouping by project
    const groupBy = searchParams.get("group") || "";
    if (groupBy === "project") {
      const grouped: Record<string, any> = {};
      for (const t of augmentedTasks) {
        const name = (t as any).project?.name || "Unassigned Project";
        if (!grouped[name]) grouped[name] = [];
        grouped[name].push(t);
      }
      return NextResponse.json({ data: grouped, total, page, limit });
    }

    return NextResponse.json({ data: augmentedTasks, total, page, limit });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const contentType = request.headers.get("content-type") || "";

    // Get current user
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    const payload = token ? verifyAuthToken(token) : null;
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(payload.role === "admin" || payload.role === "manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let fields: any = {};
    const attachments: any[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      fields.title = String(formData.get("title") || "");
      fields.description = String(formData.get("description") || "");
      fields.type = String(formData.get("type") || "Task");
      fields.priority = String(formData.get("priority") || "Medium");
      fields.project = String(formData.get("project") || "");
      fields.assignee = formData.get("assignee") ? String(formData.get("assignee")) : undefined;
      fields.reporter = String(formData.get("reporter") || "");
      fields.dueDate = formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : undefined;

      const files = formData.getAll("attachments");
      for (const f of files) {
        // Robust check for file/blob across different Node environments
        if (f && typeof f === "object" && "size" in f && (f as any).size > 0) {
          const file = f as any;
          // Validate file size (5MB)
          const MAX_SIZE = 5 * 1024 * 1024;
          if (file.size > MAX_SIZE) {
            console.warn(`File exceeds 5MB limit`);
            continue;
          }

          // Validate file type
          const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
          if (!allowedTypes.includes(file.type)) {
            console.warn(`File has unsupported type: ${file.type}`);
            continue;
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          try {
            const base64 = buffer.toString("base64");
            const dataUri = `data:${file.type};base64,${base64}`;
            const res = await cloudinary.uploader.upload(dataUri, {
              folder: `tasks/attachments`,
              resource_type: "auto",
              format: "webp",
              quality: "auto"
            });

            attachments.push({
              url: res.secure_url,
              publicId: res.public_id,
              fileName: file.name || "attachment",
              fileSize: file.size,
              mimeType: file.type || "image/jpeg",
              uploadedBy: payload.sub,
              uploadedAt: new Date()
            });
          } catch (e) {
            console.error(`Cloudinary upload failed:`, e);
            continue;
          }
        }
      }
    } else {
      fields = await request.json();
      // If attachments are passed in JSON (existing ones), use them
      if (fields.attachments && Array.isArray(fields.attachments)) {
        attachments.push(...fields.attachments);
      }
    }

    const { title, description, type, priority, project, assignee, reporter: rawReporter, dueDate } = fields;

    // derive reporter from the previously-validated token if not provided
    const reporter = (rawReporter && String(rawReporter).trim()) || payload?.sub || undefined;

    if (!title || !project || !reporter) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const proj = await Project.findById(project).lean();
    if (!proj) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const rep = await User.findById(reporter).lean();
    if (!rep) return NextResponse.json({ error: "Reporter not found" }, { status: 404 });

    // Get next sequence for project
    const counter = await TaskCounter.findOneAndUpdate(
      { project },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seq = (counter && (counter as any).seq) || 1;

    // Build a prefix from project name (safe fallback to last 4 of id)
    const prefix = (proj.name || "PRJ")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 4) || String(project).slice(-4).toUpperCase();

    const key = `${prefix}-${seq}`;

    const created = await Task.create({
      key,
      title,
      description: description || "",
      type: type || "Task",
      priority: priority || "Medium",
      project,
      assignee: assignee || null,
      reporter,
      status: "backlog",
      dueDate: dueDate ? new Date(dueDate) : null,
      attachments
    });

    const populated = await Task.findById(created._id)
      .populate({ path: "project", select: "name" })
      .populate({ path: "assignee", select: "firstName lastName email" })
      .populate({ path: "reporter", select: "firstName lastName email" })
      .lean();

    // Create activity log entry
    try {
      await TaskActivityLog.create({
        task: created._id,
        user: payload.sub,
        eventType: "TASK_CREATED",
        description: `Task created with key ${key}`,
        metadata: {
          taskData: populated
        }
      });
    } catch (e) {
      console.error("Failed to create activity log:", e);
    }

    // audit: task created
    try {
      await captureAuditLogs(null, populated as any, { id: payload?.sub, role: payload?.role }, { ip: request.headers.get("x-forwarded-for") || "", ua: request.headers.get("user-agent") || "" });
    } catch (e) {
      console.error("audit create failed", e);
    }

    return NextResponse.json({ data: populated }, { status: 201 });
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
