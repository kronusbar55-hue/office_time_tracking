import { Project } from "@/models/Project";
import { ProjectCounter } from "@/models/ProjectCounter";
import { Types } from "mongoose";
//
export class ProjectService {
    static async createProject(data: { name: string; key: string; description?: string; ownerId: string }) {
        const project = await Project.create({
            name: data.name,
            key: data.key.toUpperCase(),
            description: data.description,
            owner: new Types.ObjectId(data.ownerId),
            members: [{ user: new Types.ObjectId(data.ownerId), role: "admin" }],
        });

        // Initialize counter
        await ProjectCounter.create({ projectId: project._id, count: 0 });

        return project;
    }

    static async getProjects(userId: string) {
        return Project.find({
            $or: [
                { owner: new Types.ObjectId(userId) },
                { "members.user": new Types.ObjectId(userId) },
            ],
        }).populate("owner", "firstName lastName email avatarUrl");
    }

    static async getProjectById(projectId: string) {
        return Project.findById(projectId).populate("members.user", "firstName lastName email avatarUrl");
    }

    static async addMember(projectId: string, userId: string, role: string) {
        return Project.findByIdAndUpdate(
            projectId,
            {
                $addToSet: {
                    members: { user: new Types.ObjectId(userId), role },
                },
            },
            { new: true }
        );
    }
}
