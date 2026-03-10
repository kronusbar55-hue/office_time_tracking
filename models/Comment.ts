import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

export interface IComment extends Document {
    taskId: Types.ObjectId;
    author: Types.ObjectId;
    content: any; // JSON for rich text or string
    mentions: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
        author: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: Schema.Types.Mixed, required: true },
        mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
    { timestamps: true }
);

export const Comment = (models && models.Comment) || model<IComment>("Comment", CommentSchema);
export default Comment;
