import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ICheckInOutSession {
  clockIn: Date;
  clockOut?: Date | null;
  duration: number; // in minutes
  location?: string;
  deviceType?: "web" | "mobile" | "kiosk";
  notes?: string;
}

export interface ICheckInOut {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  userRole: string;
  date: string; // YYYY-MM-DD
  shift?: Types.ObjectId; // assigned shift for this day

  // Daily Aggregates
  sessions: ICheckInOutSession[];
  workMinutes: number; // total duration of all sessions
  breakMinutes: number; // total break duration

  // Status & Flags
  status: "Present" | "Absent" | "Half-Day" | "Leave" | "Holiday" | "Week-Off";
  isOvertime: boolean;
  isLateCheckIn: boolean; // based on first session
  isEarlyCheckOut: boolean; // based on last session
  attendancePercentage: number;
  overtimeMinutes: number;

  // Metadata
  notes?: string;
}

const SessionSchema = new Schema<ICheckInOutSession>({
  clockIn: { type: Date, required: true },
  clockOut: { type: Date, default: null },
  duration: { type: Number, default: 0 },
  location: { type: String },
  deviceType: { type: String, enum: ["web", "mobile", "kiosk"], default: "web" },
  notes: { type: String }
});

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
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    shift: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
      index: true
    },
    sessions: {
      type: [SessionSchema],
      default: []
    },
    workMinutes: {
      type: Number,
      default: 0
    },
    breakMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Half-Day", "Leave", "Holiday", "Week-Off"],
      default: "Absent",
      index: true
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
    },
    notes: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

// Unique index ensures one document per user per day
CheckInOutSchema.index({ user: 1, date: 1 }, { unique: true });
CheckInOutSchema.index({ userRole: 1, date: 1 });

export const CheckInOut: Model<ICheckInOut> =
  (models.CheckInOut as Model<ICheckInOut>) || model<ICheckInOut>("CheckInOut", CheckInOutSchema);

export default CheckInOut;
