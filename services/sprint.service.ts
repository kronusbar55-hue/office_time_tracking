import { Sprint } from "@/models/Sprint";
import { Task } from "@/models/Task";
import { Types } from "mongoose";

export class SprintService {
    static async createSprint(projectId: string, name: string, goal?: string) {
        return Sprint.create({
            projectId: new Types.ObjectId(projectId),
            name,
            goal,
            status: "PLANNED",
        });
    }

    static async getSprints(projectId: string) {
        return Sprint.find({ projectId: new Types.ObjectId(projectId) }).sort({ createdAt: -1 });
    }

    static async startSprint(sprintId: string, startDate: Date, endDate: Date) {
        return Sprint.findByIdAndUpdate(
            sprintId,
            { status: "ACTIVE", startDate, endDate },
            { new: true }
        );
    }

    static async completeSprint(sprintId: string) {
        const sprint = await Sprint.findByIdAndUpdate(
            sprintId,
            { status: "COMPLETED" },
            { new: true }
        );

        // Get incomplete tasks and move them to backlog or next sprint
        // For now, just mark sprint as completed. Logic for rollover can be added.
        return sprint;
    }
}
