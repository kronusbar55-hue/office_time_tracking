import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

export interface INotification extends Document {
    userId: Types.ObjectId;
    type: "TASK_ASSIGNED" | "COMMENT_MENTION" | "TASK_MOVED" | "DUE_DATE_REMINDER";
    taskId: Types.ObjectId;
    message: string;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: {
            type: String,
            enum: ["TASK_ASSIGNED", "COMMENT_MENTION", "TASK_MOVED", "DUE_DATE_REMINDER"],
            required: true,
        },
        taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export const Notification = (models && models.Notification) || model<INotification>("Notification", NotificationSchema);
export default Notification;
