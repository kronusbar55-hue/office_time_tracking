import { Task } from "@/models/Task";
import { ProjectCounter } from "@/models/ProjectCounter";
import { Project } from "@/models/Project";
import { Activity } from "@/models/Activity";
import { Types } from "mongoose";

export class TaskService {
    static async createTask(data: {
        title: string;
        projectId: string;
        reporterId: string;
        description?: any;
        priority?: string;
        type?: string;
        assigneeId?: string;
        sprintId?: string;
        storyPoints?: number;
        dueDate?: Date;
    }) {
        const project = await Project.findById(data.projectId);
        if (!project) throw new Error("Project not found");

        // Get next task number
        const counter = await ProjectCounter.findOneAndUpdate(
            { projectId: project._id },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        const taskKey = `${project.key}-${counter.count}`;

        const task = await Task.create({
            ...data,
            tenantId: (project as any).tenantId || new Types.ObjectId(data.reporterId),
            key: taskKey,
            reporter: new Types.ObjectId(data.reporterId),
            assignee: data.assigneeId ? new Types.ObjectId(data.assigneeId) : undefined,
            projectId: project._id,
            sprintId: data.sprintId ? new Types.ObjectId(data.sprintId) : undefined,
        });

        // Log activity
        await Activity.create({
            taskId: task._id,
            userId: new Types.ObjectId(data.reporterId),
            action: "CREATED",
            newValue: taskKey,
        });

        return task;
    }

    static async updateTask(taskId: string, userId: string, updates: any) {
        const oldTask = await Task.findById(taskId);
        if (!oldTask) throw new Error("Task not found");

        const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
        if (!task) throw new Error("Task not found");

        // Potential activity logging for specific fields
        const changes = [];
        if (updates.status && updates.status !== oldTask.status) {
            changes.push({ action: "STATUS_CHANGED", old: oldTask.status, new: updates.status });
        }
        if (updates.assignee && updates.assignee !== oldTask.assignee?.toString()) {
            changes.push({ action: "ASSIGNEE_CHANGED", old: oldTask.assignee, new: updates.assignee });
        }

        for (const change of changes) {
            await Activity.create({
                taskId: task._id,
                userId: new Types.ObjectId(userId),
                action: change.action,
                oldValue: change.old?.toString(),
                newValue: change.new?.toString(),
            });
        }

        return task;
    }

    static async getTasksByProject(projectId: string, filters: any = {}) {
        // Build query based on filters (labels, assignee, status, etc)
        const query: any = { projectId: new Types.ObjectId(projectId) };
        if (filters.status) query.status = filters.status;
        if (filters.assignee) query.assignee = new Types.ObjectId(filters.assignee);
        if (filters.sprintId) query.sprintId = filters.sprintId === "backlog" ? null : new Types.ObjectId(filters.sprintId);

        return Task.find(query)
            .populate("assignee", "firstName lastName avatarUrl")
            .populate("labels")
            .sort({ order: 1, createdAt: -1 });
    }

    static async moveTask(taskId: string, userId: string, toStatus: string, order: number) {
        return this.updateTask(taskId, userId, { status: toStatus, order });
    }
}
