import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITimeSessionBreak {
  _id: Types.ObjectId;
  timeSession: Types.ObjectId;
  breakStart: Date;
  breakEnd?: Date | null;
  durationMinutes?: number;
  reason?: string;
}

const TimeSessionBreakSchema = new Schema<ITimeSessionBreak>(
  {
    timeSession: { type: Schema.Types.ObjectId, ref: "TimeSession", required: true, index: true },
    breakStart: { type: Date, required: true },
    breakEnd: { type: Date, default: null },
    durationMinutes: { type: Number, default: 0 },
    reason: { type: String, default: "Unspecified" }
  },
  { timestamps: true }
);

TimeSessionBreakSchema.index({ timeSession: 1, breakStart: 1 });

export const TimeSessionBreak: Model<ITimeSessionBreak> =
  (models.TimeSessionBreak as Model<ITimeSessionBreak>) ||
  model<ITimeSessionBreak>("TimeSessionBreak", TimeSessionBreakSchema);

export default TimeSessionBreak;
