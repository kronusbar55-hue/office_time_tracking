import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Board } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { Status } from "@/models/IssueWorkflow";
import { requirePermission } from "@/lib/jiraPermissions";
import { successResp, errorResp } from "@/lib/apiResponse";

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
    const projectId = searchParams.get("projectId");
    const boardType = searchParams.get("type"); // kanban or scrum
    const sprintId = searchParams.get("sprintId");

    let query: any = {};
    if (projectId) query.project = projectId;
    if (boardType) query.type = boardType;
    if (sprintId && boardType === "scrum") query.sprint = sprintId;

    const board = await Board.findOne(query)
      .populate({
        path: "columns.issues",
        model: "Task",
        select: "key title priority assignee dueDate status"
      })
      .populate("columns.statusId", "name color")
      .lean();

    if (!board) {
      // Create default board if doesn't exist
      if (!projectId) {
        return NextResponse.json(errorResp("Project ID required"), { status: 400 });
      }

      const statuses = await Status.find({ project: projectId }).sort({ sortOrder: 1 }).lean();

      const newBoard = await Board.create({
        project: projectId,
        name: boardType === "scrum" ? "Scrum Board" : "Kanban Board",
        type: boardType || "kanban",
        sprint: sprintId || null,
        columns: (statuses as any[]).map((status: any) => ({
          name: status.name,
          statusId: status._id,
          wipLimit: undefined,
          issues: []
        })),
        createdBy: payload.sub
      });

      return NextResponse.json(
        successResp("Board created", { id: newBoard._id.toString() })
      );
    }

    return NextResponse.json(
      successResp("Board retrieved", {
        id: board._id.toString(),
        name: board.name,
        type: board.type,
        columns: board.columns
      })
    );
  } catch (err: any) {
    console.error("[jira/boards/GET] error:", err);
    return NextResponse.json(
      errorResp("Failed to retrieve board", err?.message || err),
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { authorized, payload, response } = await requirePermission(["create_board"]);
    if (!authorized) return response;

    await connectDB();

    const body = (await request.json().catch(() => ({}))) as {
      boardId: string;
      action: "move_issue" | "update_wip_limit";
      issueId?: string;
      fromColumn?: string;
      toColumn?: string;
      columnName?: string;
      wipLimit?: number;
    };

    if (!body.boardId || !body.action) {
      return NextResponse.json(
        errorResp("Missing required fields"),
        { status: 400 }
      );
    }

    const board = await Board.findById(body.boardId);
    if (!board) {
      return NextResponse.json(errorResp("Board not found"), { status: 404 });
    }

    if (body.action === "move_issue") {
      if (!body.issueId || !body.fromColumn || !body.toColumn) {
        return NextResponse.json(
          errorResp("Missing issue or column info"),
          { status: 400 }
        );
      }

      // Remove from source column
      const fromCol = board.columns.find((c: any) => c.name === body.fromColumn);
      if (fromCol) {
        fromCol.issues = (fromCol.issues as any[]).filter((id) => id.toString() !== body.issueId);
      }

      // Add to target column
      const toCol = board.columns.find((c: any) => c.name === body.toColumn);
      if (toCol) {
        if (!(toCol.issues as any[]).some((id) => id.toString() === body.issueId)) {
          toCol.issues.push(body.issueId as any);
        }
      }

      // Update task status
      const status = await Status.findById(
        board.columns.find((c: any) => c.name === body.toColumn)?.statusId
      ).lean();
      if (status) {
        await Task.findByIdAndUpdate(body.issueId, { status: status.name });
      }
    } else if (body.action === "update_wip_limit" && body.columnName && body.wipLimit !== undefined) {
      const col = board.columns.find((c: any) => c.name === body.columnName);
      if (col) {
        col.wipLimit = body.wipLimit;
      }
    }

    await board.save();

    return NextResponse.json(
      successResp(`Board ${body.action}d`, { id: board._id.toString() })
    );
  } catch (err: any) {
    console.error("[jira/boards/PUT] error:", err);
    return NextResponse.json(
      errorResp("Failed to update board", err?.message || err),
      { status: 500 }
    );
  }
}
