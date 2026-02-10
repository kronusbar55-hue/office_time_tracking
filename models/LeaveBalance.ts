import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ILeaveBalance {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  year: number;
  leaveType: Types.ObjectId;
  totalAllocated: number; // minutes
  used: number; // minutes
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    year: { type: Number, required: true, index: true },
    leaveType: { type: Schema.Types.ObjectId, ref: "LeaveType", required: true, index: true },
    totalAllocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 }
  },
  { timestamps: true }
);

LeaveBalanceSchema.index({ user: 1, year: 1, leaveType: 1 }, { unique: true });

export const LeaveBalance: Model<ILeaveBalance> =
  (models.LeaveBalance as Model<ILeaveBalance>) || model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema);

export default LeaveBalance;
