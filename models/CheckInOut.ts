import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ICheckInOut {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userRole: string;
  date: string; // YYYY-MM-DD
  clockIn: Date;
  clockOut?: Date | null;
  workMinutes?: number;
  breakMinutes?: number;
  location?: string;
  deviceType?: "web" | "mobile" | "kiosk";
  notes?: string;
  isOvertime: boolean;
  isLateCheckIn: boolean;
  isEarlyCheckOut: boolean;
  attendancePercentage?: number;
  overtimeMinutes?: number;
}

const CheckInOutSchema = new Schema<ICheckInOut>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    userRole: {
      type: String,
      enum: ["admin", "hr", "manager", "employee"],
      required: true,
      index: true
    },
    date: {
      type: String,
      required: true,
      index: true
    },
    clockIn: {
      type: Date,
      required: true,
      index: true
    },
    clockOut: {
      type: Date,
      default: null
    },
    workMinutes: {
      type: Number,
      default: 0
    },
    breakMinutes: {
      type: Number,
      default: 0
    },
    location: {
      type: String,
      default: null
    },
    deviceType: {
      type: String,
      enum: ["web", "mobile", "kiosk"],
      default: "web"
    },
    notes: {
      type: String,
      default: null
    },
    isOvertime: {
      type: Boolean,
      default: false,
      index: true
    },
    isLateCheckIn: {
      type: Boolean,
      default: false
    },
    isEarlyCheckOut: {
      type: Boolean,
      default: false
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    overtimeMinutes: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

CheckInOutSchema.index({ user: 1, date: 1 });
CheckInOutSchema.index({ userRole: 1, date: 1 });
CheckInOutSchema.index({ date: 1 });

export const CheckInOut: Model<ICheckInOut> =
  (models.CheckInOut as Model<ICheckInOut>) || model<ICheckInOut>("CheckInOut", CheckInOutSchema);

export default CheckInOut;
