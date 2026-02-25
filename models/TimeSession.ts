import mongoose, { Schema, model, models, type Model, type Types } from "mongoose";

export type TimeSessionStatus = "active" | "completed";

export interface ITimeSession {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  date: string; // YYYY-MM-DD
  clockIn: Date;
  clockOut?: Date | null;
  totalWorkMinutes?: number;
  totalBreakMinutes?: number;
  status: TimeSessionStatus;
  userRole?: string;
  location?: string;
  deviceType?: "web" | "mobile" | "kiosk";
  notes?: string;
  isOvertime?: boolean;
  lateClockIn?: boolean;
  earlyClockOut?: boolean;
}

const TimeSessionSchema = new Schema<ITimeSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    clockIn: { type: Date, required: true, index: true },
    clockOut: { type: Date, default: null, index: true },
    totalWorkMinutes: { type: Number, default: 0 },
    totalBreakMinutes: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "completed"], default: "active", index: true },
    userRole: { type: String, enum: ["admin", "hr", "manager", "employee"], default: "employee" },
    location: { type: String, default: null },
    deviceType: { type: String, enum: ["web", "mobile", "kiosk"], default: "web" },
    notes: { type: String, default: null },
    isOvertime: { type: Boolean, default: false },
    lateClockIn: { type: Boolean, default: false },
    earlyClockOut: { type: Boolean, default: false }
  },
  { timestamps: true }
);

TimeSessionSchema.index({ user: 1, date: 1 });
TimeSessionSchema.index({ user: 1, clockIn: 1 });

export const TimeSession = (models && models.TimeSession) || model<ITimeSession>("TimeSession", TimeSessionSchema);
export default TimeSession;
