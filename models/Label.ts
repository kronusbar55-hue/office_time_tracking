import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

export interface ILabel extends Document {
    name: string;
    color: string; // hex
    projectId: Types.ObjectId;
}

const LabelSchema = new Schema<ILabel>(
    {
        name: { type: String, required: true, trim: true },
        color: { type: String, required: true, default: "#6366f1" },
        projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    },
    { timestamps: true }
);

export const Label = (models && models.Label) || model<ILabel>("Label", LabelSchema);
export default Label;
