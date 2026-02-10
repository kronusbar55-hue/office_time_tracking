import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import SubTask from "@/models/SubTask";
import { Task } from "@/models/Task";
import IssueHierarchy from "@/models/IssueHierarchy";
import { successResp, errorResp } from "@/lib/apiResponse";
import { Types } from "mongoose";

/**
 * Create a new sub-task under a parent issue (Task, Story, or Epic)
 */
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
      parentTaskId: string;
      title: string;
      description?: string;
      assignee?: string;
      priority?: string;
      dueDate?: string;
      estimatedTime?: number;
      labels?: string[];
    };

    if (!body.parentTaskId || !body.title) {
      return NextResponse.json(
        errorResp("Missing required fields: parentTaskId, title"),
        { status: 400 }
      );
    }

    // Verify parent task exists
    const parentTask = await Task.findById(body.parentTaskId);
    if (!parentTask) {
      return NextResponse.json(
        errorResp("Parent task not found"),
        { status: 404 }
      );
    }

    // Determine parent issue type
    const parentType = parentTask.type?.toLowerCase() || "task";
    if (!["epic", "story", "task"].includes(parentType)) {
      return NextResponse.json(
        errorResp("Sub-tasks can only be created under Epic, Story, or Task"),
        { status: 400 }
      );
    }

    // Get next sub-task number for this parent
    const count = await SubTask.countDocuments({ parentTask: body.parentTaskId });
    const subTaskKey = `${parentTask.key}-${count + 1}`;

    // Create sub-task
    const subTask = await SubTask.create({
      key: subTaskKey,
      title: body.title,
      description: body.description,
      parentTask: body.parentTaskId,
      parentIssueType: parentType,
      assignee: body.assignee ? new Types.ObjectId(body.assignee) : null,
      reporter: payload.sub,
      createdBy: payload.sub,
      priority: body.priority || "medium",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      estimatedTime: body.estimatedTime,
      status: "todo",
      labels: body.labels || [],
      progressPercent: 0
    });

    // Create hierarchy mapping
    const parentHierarchy = await IssueHierarchy.findOne({ issue: body.parentTaskId });
    
    const hierarchyData: any = {
      issue: subTask._id,
      issueType: "subtask",
      level: 4,
      totalSubTasks: 0,
      completedSubTasks: 0,
      progressPercent: 0
    };

    // Copy parent hierarchy levels
    if (parentHierarchy) {
      hierarchyData.epic = parentHierarchy.epic;
      hierarchyData.story = parentHierarchy.story;
      hierarchyData.task = body.parentTaskId;
    } else if (parentType === "epic") {
      hierarchyData.epic = body.parentTaskId;
    } else if (parentType === "story") {
      hierarchyData.story = body.parentTaskId;
    } else {
      hierarchyData.task = body.parentTaskId;
    }

    await IssueHierarchy.create(hierarchyData);

    // Update parent task's child count
    const childCount = await SubTask.countDocuments({
      parentTask: body.parentTaskId,
      isDeleted: false
    });
    
    await Task.findByIdAndUpdate(
      body.parentTaskId,
      { $set: { childTasks: childCount } },
      { new: true }
    );

    return NextResponse.json(
      successResp("Sub-task created", {
        id: subTask._id.toString(),
        key: subTask.key,
        title: subTask.title,
        status: subTask.status,
        parentKey: parentTask.key
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[jira/subtasks/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to create sub-task", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * List all sub-tasks for a parent issue
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
    const parentTaskId = searchParams.get("parentTaskId");
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!parentTaskId) {
      return NextResponse.json(
        errorResp("Missing parentTaskId parameter"),
        { status: 400 }
      );
    }

    const filter: any = {
      parentTask: new Types.ObjectId(parentTaskId),
      isDeleted: false
    };

    if (status) {
      filter.status = status;
    }

    if (assignee) {
      filter.assignee = new Types.ObjectId(assignee);
    }

    const total = await SubTask.countDocuments(filter);

    const subTasks = await SubTask.find(filter)
      .populate("assignee", "firstName lastName email avatar")
      .populate("reporter", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Calculate parent completion percentage
    const completedCount = await SubTask.countDocuments({
      parentTask: new Types.ObjectId(parentTaskId),
      status: "done",
      isDeleted: false
    });

    const completionPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return NextResponse.json(
      successResp("Sub-tasks retrieved", {
        parentTaskId,
        total,
        completed: completedCount,
        completionPercent,
        subtasks: subTasks.map((st: any) => ({
          id: st._id.toString(),
          key: st.key,
          title: st.title,
          status: st.status,
          priority: st.priority,
          assignee: st.assignee,
          dueDate: st.dueDate,
          estimatedTime: st.estimatedTime,
          loggedTime: st.loggedTime,
          progressPercent: st.progressPercent
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/subtasks/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve sub-tasks", err?.message || err),
      { status: 500 }
    );
  }
}
