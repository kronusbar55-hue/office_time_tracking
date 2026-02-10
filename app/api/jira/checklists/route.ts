import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Checklist from "@/models/Checklist";
import { Task } from "@/models/Task";
import SubTask from "@/models/SubTask";
import { AuditLog } from "@/models/AuditLog";
import { successResp, errorResp } from "@/lib/apiResponse";
import { Types } from "mongoose";

/**
 * Create or get checklist for an issue
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
      issueId: string;
      action?: "create" | "add_item" | "toggle_item" | "remove_item" | "reorder";
      item?: {
        title: string;
        assignee?: string;
        dueDate?: string;
        order?: number;
      };
      itemId?: string;
      items?: Array<{ _id?: string; order: number }>;
    };

    if (!body.issueId) {
      return NextResponse.json(
        errorResp("Missing issueId"),
        { status: 400 }
      );
    }

    // Verify issue exists (can be Task or SubTask)
    let issue = await Task.findById(body.issueId);
    let isSubTask = false;

    if (!issue) {
      issue = await SubTask.findById(body.issueId);
      isSubTask = true;
    }

    if (!issue) {
      return NextResponse.json(
        errorResp("Issue not found"),
        { status: 404 }
      );
    }

    // Get or create checklist
    let checklist = await Checklist.findOne({ issue: body.issueId });

    if (!checklist && body.action !== "add_item") {
      // Create empty checklist
      checklist = await Checklist.create({
        issue: body.issueId,
        items: [],
        totalItems: 0,
        completedItems: 0,
        progressPercent: 0
      });
    }

    // Handle different actions
    if (body.action === "add_item") {
      if (!body.item?.title) {
        return NextResponse.json(
          errorResp("Missing item title"),
          { status: 400 }
        );
      }

      if (!checklist) {
        checklist = await Checklist.create({
          issue: body.issueId,
          items: [],
          totalItems: 0,
          completedItems: 0,
          progressPercent: 0
        });
      }

      const newItem = {
        _id: new Types.ObjectId(),
        title: body.item.title,
        completed: false,
        assignee: body.item.assignee ? new Types.ObjectId(body.item.assignee) : undefined,
        dueDate: body.item.dueDate ? new Date(body.item.dueDate) : undefined,
        order: checklist.items.length
      };

      checklist.items?.push(newItem);
      await checklist.save();

      return NextResponse.json(
        successResp("Checklist item added", {
          itemId: newItem._id.toString(),
          title: newItem.title,
          progressPercent: checklist.progressPercent
        }),
        { status: 201 }
      );
    }

    if (body.action === "toggle_item") {
      if (!body.itemId || !checklist) {
        return NextResponse.json(
          errorResp("Missing itemId or checklist not found"),
          { status: 400 }
        );
      }

      const item = checklist.items?.find(
        (i) => i._id?.toString() === body.itemId
      );

      if (!item) {
        return NextResponse.json(
          errorResp("Checklist item not found"),
          { status: 404 }
        );
      }

      item.completed = !item.completed;
      await checklist.save();

      return NextResponse.json(
        successResp("Checklist item toggled", {
          itemId: body.itemId,
          completed: item.completed,
          progressPercent: checklist.progressPercent
        })
      );
    }

    if (body.action === "remove_item") {
      if (!body.itemId || !checklist) {
        return NextResponse.json(
          errorResp("Missing itemId"),
          { status: 400 }
        );
      }

      checklist.items = checklist.items?.filter(
        (i) => i._id?.toString() !== body.itemId
      );

      await checklist.save();

      return NextResponse.json(
        successResp("Checklist item removed", {
          progressPercent: checklist.progressPercent
        })
      );
    }

    if (body.action === "reorder") {
      if (!body.items || !checklist) {
        return NextResponse.json(
          errorResp("Missing items array"),
          { status: 400 }
        );
      }

      // Update order for each item
      body.items.forEach((item) => {
        const checklistItem = checklist?.items?.find(
          (i) => i._id?.toString() === item._id
        );
        if (checklistItem) {
          checklistItem.order = item.order;
        }
      });

      await checklist.save();

      return NextResponse.json(
        successResp("Checklist reordered", {
          itemCount: checklist.items?.length || 0
        })
      );
    }

    // Default: return checklist
    return NextResponse.json(
      successResp("Checklist retrieved", {
        id: checklist._id.toString(),
        issueId: body.issueId,
        items: checklist.items?.map((item) => ({
          id: item._id?.toString(),
          title: item.title,
          completed: item.completed,
          assignee: item.assignee,
          dueDate: item.dueDate,
          order: item.order
        })),
        totalItems: checklist.totalItems,
        completedItems: checklist.completedItems,
        progressPercent: checklist.progressPercent
      })
    );
  } catch (err: any) {
    console.error("[jira/checklists/POST] error:", err);
    return NextResponse.json(
      errorResp("Failed to manage checklist", err?.message || err),
      { status: 500 }
    );
  }
}

/**
 * Get checklist for issue
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
    const issueId = searchParams.get("issueId");

    if (!issueId) {
      return NextResponse.json(
        errorResp("Missing issueId"),
        { status: 400 }
      );
    }

    const checklist = await Checklist.findOne({ issue: issueId })
      .populate("items.assignee", "firstName lastName")
      .lean();

    if (!checklist) {
      return NextResponse.json(
        successResp("No checklist for issue", {
          items: [],
          progressPercent: 0
        })
      );
    }

    return NextResponse.json(
      successResp("Checklist retrieved", {
        id: checklist._id.toString(),
        items: checklist.items?.map((item: any) => ({
          id: item._id?.toString(),
          title: item.title,
          completed: item.completed,
          assignee: item.assignee,
          dueDate: item.dueDate,
          order: item.order
        })),
        totalItems: checklist.totalItems,
        completedItems: checklist.completedItems,
        progressPercent: checklist.progressPercent
      })
    );
  } catch (err: any) {
    console.error("[jira/checklists/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve checklist", err?.message || err),
      { status: 500 }
    );
  }
}
