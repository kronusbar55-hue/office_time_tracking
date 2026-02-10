import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ILeaveType {
  _id: Types.ObjectId;
  code: string; // e.g. CL, SL, PL, LWP
  name: string;
  annualQuota: number; // minutes per year (store in minutes)
  carryForward: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

const LeaveTypeSchema = new Schema<ILeaveType>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    annualQuota: { type: Number, required: true, default: 0 },
    carryForward: { type: Boolean, default: false },
    requiresApproval: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

LeaveTypeSchema.index({ code: 1 });

export const LeaveType: Model<ILeaveType> =
  (models.LeaveType as Model<ILeaveType>) || model<ILeaveType>("LeaveType", LeaveTypeSchema);

export default LeaveType;
