import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITimeSessionProject {
  _id: Types.ObjectId;
  timeSession: Types.ObjectId;
  project: Types.ObjectId;
  allocatedMinutes: number;
  note?: string;
}

const TimeSessionProjectSchema = new Schema<ITimeSessionProject>(
  {
    timeSession: { type: Schema.Types.ObjectId, ref: "TimeSession", required: true, index: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    allocatedMinutes: { type: Number, required: true },
    note: { type: String, trim: true }
  },
  { timestamps: true }
);

TimeSessionProjectSchema.index({ timeSession: 1, project: 1 }, { unique: false });

export const TimeSessionProject: Model<ITimeSessionProject> =
  (models.TimeSessionProject as Model<ITimeSessionProject>) ||
  model<ITimeSessionProject>("TimeSessionProject", TimeSessionProjectSchema);

export default TimeSessionProject;
