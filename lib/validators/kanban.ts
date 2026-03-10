import { z } from "zod";

export const ProjectSchema = z.object({
    name: z.string().min(1, "Name is required"),
    key: z.string().min(2, "Key must be at least 2 characters").max(10),
    description: z.string().optional(),
});

export const TaskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    projectId: z.string(),
    description: z.any().optional(),
    status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("BACKLOG"),
    priority: z.enum(["LOWEST", "LOW", "MEDIUM", "HIGH", "HIGHEST"]).default("MEDIUM"),
    type: z.enum(["TASK", "BUG", "STORY", "EPIC", "IMPROVEMENT"]).default("TASK"),
    assigneeId: z.string().optional(),
    sprintId: z.string().optional(),
    storyPoints: z.number().min(0).optional(),
    dueDate: z.date().optional(),
});

export const SprintSchema = z.object({
    name: z.string().min(1, "Sprint name is required"),
    goal: z.string().optional(),
    projectId: z.string(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
});

export const CommentSchema = z.object({
    taskId: z.string(),
    content: z.any(),
});
