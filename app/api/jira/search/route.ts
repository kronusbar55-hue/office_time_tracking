import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { successResp, errorResp } from "@/lib/apiResponse";

/**
 * Advanced search endpoint for Jira issues
 * Supports JQL-like filters
 * 
 * Example queries:
 * ?q=assignee:me
 * ?q=status:in_progress AND priority:high
 * ?q=label:bug AND created:>2024-01-01
 * ?q=text:"search term"
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
    const query = searchParams.get("q") || "";
    const projectId = searchParams.get("projectId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Parse JQL-like query
    const filter: any = {};

    if (projectId) {
      filter.project = projectId;
    }

    // Simple parser for common filters
    const assigneeMatch = query.match(/assignee:(\w+)/i);
    if (assigneeMatch) {
      if (assigneeMatch[1].toLowerCase() === "me") {
        filter.assignee = payload.sub;
      }
    }

    const statusMatch = query.match(/status:(\w+)/i);
    if (statusMatch) {
      filter.status = statusMatch[1].toLowerCase();
    }

    const priorityMatch = query.match(/priority:(\w+)/i);
    if (priorityMatch) {
      filter.priority = priorityMatch[1].toLowerCase();
    }

    const typeMatch = query.match(/type:(\w+)/i);
    if (typeMatch) {
      filter.type = typeMatch[1].toLowerCase();
    }

    const labelMatch = query.match(/label:(\w+)/i);
    if (labelMatch) {
      filter.labels = { $in: [labelMatch[1]] };
    }

    // Text search in summary and description
    const textMatch = query.match(/"([^"]+)"/);
    if (textMatch) {
      filter.$or = [
        { summary: { $regex: textMatch[1], $options: "i" } },
        { description: { $regex: textMatch[1], $options: "i" } }
      ];
    }

    // Date range filters
    const createdMatch = query.match(/created:([<>=]+)(\d{4}-\d{2}-\d{2})/i);
    if (createdMatch) {
      const operator = createdMatch[1];
      const date = new Date(createdMatch[2]);

      if (operator === "<") {
        filter.createdAt = { $lt: date };
      } else if (operator === ">") {
        filter.createdAt = { $gt: date };
      } else if (operator === "=") {
        filter.createdAt = { $gte: date, $lt: new Date(date.getTime() + 86400000) };
      }
    }

    const updatedMatch = query.match(/updated:([<>=]+)(\d{4}-\d{2}-\d{2})/i);
    if (updatedMatch) {
      const operator = updatedMatch[1];
      const date = new Date(updatedMatch[2]);

      if (operator === "<") {
        filter.updatedAt = { $lt: date };
      } else if (operator === ">") {
        filter.updatedAt = { $gt: date };
      } else if (operator === "=") {
        filter.updatedAt = { $gte: date, $lt: new Date(date.getTime() + 86400000) };
      }
    }

    // Unassigned filter
    if (query.includes("assignee:unassigned")) {
      filter.assignee = null;
    }

    // My issues shortcut
    if (query.includes("assignee:me") || query.includes("my issues")) {
      filter.assignee = payload.sub;
    }

    // Execute search
    const total = await Task.countDocuments(filter);

    const results = await Task.find(filter)
      .populate("assignee", "firstName lastName email avatar")
      .populate("project", "name key")
      .select("key summary priority status assignee type createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    return NextResponse.json(
      successResp("Search results", {
        query,
        total,
        limit,
        offset,
        results: results.map((r: any) => ({
          id: r._id.toString(),
          key: r.key,
          summary: r.summary,
          type: r.type,
          status: r.status,
          priority: r.priority,
          assignee: r.assignee,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt
        }))
      })
    );
  } catch (err: any) {
    console.error("[jira/search/GET] error:", err);
    return NextResponse.json(
      errorResp("Search failed", err?.message || err),
      { status: 500 }
    );
  }
}
