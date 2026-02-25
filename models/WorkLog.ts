import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IWorkLog {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  timeSession: Types.ObjectId;
  project?: Types.ObjectId;
  description: string;
  workedMinutes: number;
  breakMinutes: number;
  date: string; // YYYY-MM-DD
}

const WorkLogSchema = new Schema<IWorkLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    timeSession: { type: Schema.Types.ObjectId, ref: "TimeSession", required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    description: { type: String, required: true, trim: true },
    workedMinutes: { type: Number, required: true },
    breakMinutes: { type: Number, required: true, default: 0 },
    date: { type: String, required: true, index: true } // YYYY-MM-DD
  },
  { timestamps: true }
);

WorkLogSchema.index({ user: 1, date: 1 });
WorkLogSchema.index({ project: 1, date: 1 });

export const WorkLog: Model<IWorkLog> =
  (models.WorkLog as Model<IWorkLog>) || model<IWorkLog>("WorkLog", WorkLogSchema);

export default WorkLog;

