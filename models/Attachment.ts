import mongoose, { Schema, model, models, type Document, type Types } from "mongoose";

export interface IAttachment extends Document {
    taskId: Types.ObjectId;
    url: string;
    name: string;
    fileType: string;
    size: number;
    uploadedBy: Types.ObjectId;
    createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
    {
        taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
        url: { type: String, required: true },
        name: { type: String, required: true },
        fileType: { type: String, required: true },
        size: { type: Number, required: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

export const Attachment = (models && models.Attachment) || model<IAttachment>("Attachment", AttachmentSchema);
export default Attachment;
