import { Schema, model, models, type Model, type Types } from "mongoose";

export type LeaveDuration = "full-day" | "half-first" | "half-second";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface ILeaveRequest {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  leaveType: Types.ObjectId;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  duration: LeaveDuration;
  reason: string;
  status: LeaveStatus;
  manager?: Types.ObjectId | null;
  managerComment?: string;
  appliedAt?: Date;
  /** User IDs to CC on this leave request */
  ccUsers?: Types.ObjectId[];
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    leaveType: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
    startDate: { type: String, required: true, index: true },
    endDate: { type: String, required: true, index: true },
    duration: { type: String, enum: ["full-day", "half-first", "half-second"], required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending", index: true },
    manager: { type: Schema.Types.ObjectId, ref: "User", default: null },
    managerComment: { type: String },
    appliedAt: { type: Date, default: () => new Date() },
    ccUsers: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ user: 1, startDate: 1, endDate: 1 });

export const LeaveRequest: Model<ILeaveRequest> =
  (models.LeaveRequest as Model<ILeaveRequest>) || model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
