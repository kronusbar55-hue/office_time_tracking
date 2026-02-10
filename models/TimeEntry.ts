import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IBreak {
  startTime: Date;
  endTime?: Date | null;
  reason?: string;
}

export interface IProjectAllocation {
  project: Types.ObjectId;
  hours: number;
  notes?: string;
}

export interface ITimeEntry {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  clockIn: Date;
  clockOut?: Date | null;
  breaks: IBreak[];
  trackedMinutes?: number;
  projectAllocations?: IProjectAllocation[];
  notes?: string;
  autoClockedOut?: boolean;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      default: null,
      index: true
    },
    breaks: [
      {
        startTime: {
          type: Date,
          required: true
        },
        endTime: {
          type: Date,
          default: null
        },
        reason: String
      }
    ],
    trackedMinutes: {
      type: Number,
      default: 0
    },
    projectAllocations: [
      {
        project: {
          type: Schema.Types.ObjectId,
          ref: "Project"
        },
        hours: {
          type: Number,
          min: 0,
          required: true
        },
        notes: String
      }
    ],
    notes: {
      type: String,
      trim: true
    },
    autoClockedOut: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

TimeEntrySchema.index({ user: 1, clockIn: -1 });
TimeEntrySchema.index({ user: 1, clockOut: -1 });

export const TimeEntry: Model<ITimeEntry> =
  (models.TimeEntry as Model<ITimeEntry>) ||
  model<ITimeEntry>("TimeEntry", TimeEntrySchema);

