import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

export interface IProjectCounter extends Document {
    projectId: Types.ObjectId;
    count: number;
}

const ProjectCounterSchema = new Schema<IProjectCounter>({
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, unique: true },
    count: { type: Number, default: 0 },
});

export const ProjectCounter = (models && models.ProjectCounter) || model<IProjectCounter>("ProjectCounter", ProjectCounterSchema);
export default ProjectCounter;
