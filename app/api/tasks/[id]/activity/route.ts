import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TaskActivityLog from "@/models/TaskActivityLog";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Comment } from "@/models/Comment";
import mongoose from "mongoose";

interface Params {
  id: string;
}

export async function GET(request: Request, { params }: { params: Params }) {
  try {
    await connectDB();

    // Verify task exists
    const task = await Task.findById(params.id).select("_id").lean();
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const sort = searchParams.get("sort") || "-createdAt"; // Default: newest first

    // Fetch activities
    const activities = await TaskActivityLog.find({
      task: params.id
    })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "user",
        select: "firstName lastName email role"
      })
      .lean();
    // Resolve names and fetch extra context (like comment content)
    const processedActivities = await Promise.all(activities.map(async (activity: any) => {
      // Resolve Comment Content for COMMENT_ADDED events
      if (activity.eventType === "COMMENT_ADDED" && (activity.metadata as any)?.commentId) {
          try {
              const c: any = await Comment.findById((activity.metadata as any).commentId).select("content").lean();
              if (c) {
                  (activity.metadata as any).commentContent = c.content;
              }
          } catch (e) {
              console.error("Failed to fetch comment content for activity:", e);
          }
      }

      if (!activity.fieldChanges || activity.fieldChanges.length === 0) return activity;

      const resolvedChanges = await Promise.all(activity.fieldChanges.map(async (change: any) => {
        // If already resolved (new logs), return as is
        if (change.displayOldValue && change.displayNewValue) return change;

        const updatedChange = { ...change };
        const { fieldName, oldValue, newValue } = change;

        try {
            // Resolve generic User IDs (Assignee, Reporter)
            if (fieldName === "assignee" || fieldName === "reporter") {
               const oldId = String(oldValue || "");
               const newId = String(newValue || "");

               if (oldId && mongoose.Types.ObjectId.isValid(oldId)) {
                 const u = await User.findById(oldId).select("firstName lastName").lean();
                 if (u) updatedChange.displayOldValue = `${(u as any).firstName} ${(u as any).lastName}`;
                 else updatedChange.displayOldValue = `User (${oldId.slice(-4)})`;
               }

               if (newId && mongoose.Types.ObjectId.isValid(newId)) {
                 const u = await User.findById(newId).select("firstName lastName").lean();
                 if (u) updatedChange.displayNewValue = `${(u as any).firstName} ${(u as any).lastName}`;
                 else updatedChange.displayNewValue = `User (${newId.slice(-4)})`;
               }
            } 
            
            // Resolve Project IDs
            else if (fieldName === "project") {
               const oldId = String(oldValue || "");
               const newId = String(newValue || "");

               if (oldId && mongoose.Types.ObjectId.isValid(oldId)) {
                 const p = await Project.findById(oldId).select("name").lean();
                 if (p) updatedChange.displayOldValue = (p as any).name;
                 else updatedChange.displayOldValue = `Project (${oldId.slice(-4)})`;
               }

               if (newId && mongoose.Types.ObjectId.isValid(newId)) {
                 const p = await Project.findById(newId).select("name").lean();
                 if (p) updatedChange.displayNewValue = (p as any).name;
                 else updatedChange.displayNewValue = `Project (${newId.slice(-4)})`;
               }
            }
        } catch (e) {
            console.error(`Failed to resolve name for ${fieldName}:`, e);
        }

        return updatedChange;
      }));

      return { ...activity, fieldChanges: resolvedChanges };
    }));

    // Get total count
    const total = await TaskActivityLog.countDocuments({ task: params.id });

    return NextResponse.json({
      data: processedActivities,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
