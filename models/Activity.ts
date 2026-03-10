import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

export interface IActivity extends Document {
    taskId: Types.ObjectId;
    userId: Types.ObjectId;
    action: string; // "CREATED" | "STATUS_CHANGED" | "ASSIGNEE_CHANGED" | "COMMENT_ADDED" etc.
    oldValue?: string;
    newValue?: string;
    timestamp: Date;
}

const ActivitySchema = new Schema<IActivity>(
    {
        taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        action: { type: String, required: true },
        oldValue: { type: String },
        newValue: { type: String },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Activity = (models && models.Activity) || model<IActivity>("Activity", ActivitySchema);
export default Activity;
