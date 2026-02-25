import mongoose, { Schema, model, models, type Model, type Types } from "mongoose";

export interface IAttendanceLogBreak {
    breakStart: Date;
    breakEnd?: Date | null;
}

export interface IAttendanceLog {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    checkInTime?: Date | null;
    checkOutTime?: Date | null;
    breaks: IAttendanceLogBreak[];
    status: "IN" | "BREAK" | "OUT";
    lastActivityAt: Date;
    date: string; // YYYY-MM-DD for indexing and easier lookup
    totalWorkMs?: number;
    overtimeMs?: number;
    totalBreakMs?: number;
}

const AttendanceLogSchema = new Schema<IAttendanceLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        checkInTime: {
            type: Date,
            default: null
        },
        checkOutTime: {
            type: Date,
            default: null
        },
        breaks: [
            {
                breakStart: { type: Date, required: true },
                breakEnd: { type: Date, default: null }
            }
        ],
        status: {
            type: String,
            enum: ["IN", "BREAK", "OUT"],
            default: "OUT",
            index: true
        },
        lastActivityAt: {
            type: Date,
            default: Date.now
        },
        date: {
            type: String,
            required: true,
            index: true
        },
        totalWorkMs: {
            type: Number,
            default: 0
        },
        overtimeMs: {
            type: Number,
            default: 0
        },
        totalBreakMs: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
);

// Ensure one log per user per day for history, though 'live' usually cares about 'today'
AttendanceLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export const AttendanceLog = (models && models.AttendanceLog) || model<IAttendanceLog>("AttendanceLog", AttendanceLogSchema);
export default AttendanceLog;
