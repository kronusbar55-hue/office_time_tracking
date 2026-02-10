import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITaskActivityLog {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  user?: Types.ObjectId;
  action: string;
  from?: any;
  to?: any;
  note?: string;
}

const TaskActivityLogSchema = new Schema<ITaskActivityLog>(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true },
    from: { type: Schema.Types.Mixed },
    to: { type: Schema.Types.Mixed },
    note: { type: String }
  },
  { timestamps: true }
);

export const TaskActivityLog: Model<ITaskActivityLog> =
  (models.TaskActivityLog as Model<ITaskActivityLog>) ||
  model<ITaskActivityLog>("TaskActivityLog", TaskActivityLogSchema);

export default TaskActivityLog;
