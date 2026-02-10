import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ILeaveAttachment {
  _id: Types.ObjectId;
  leaveRequest: Types.ObjectId;
  url: string;
  filename?: string;
  mimeType?: string;
  publicId?: string;
  size?: number;
}

const LeaveAttachmentSchema = new Schema<ILeaveAttachment>(
  {
    leaveRequest: { type: Schema.Types.ObjectId, ref: "LeaveRequest" },
    url: { type: String, required: true },
    filename: { type: String },
    mimeType: { type: String }
    ,publicId: { type: String },
    size: { type: Number }
  },
  { timestamps: true }
);

LeaveAttachmentSchema.index({ leaveRequest: 1 });

export const LeaveAttachment: Model<ILeaveAttachment> =
  (models.LeaveAttachment as Model<ILeaveAttachment>) || model<ILeaveAttachment>("LeaveAttachment", LeaveAttachmentSchema);

export default LeaveAttachment;
