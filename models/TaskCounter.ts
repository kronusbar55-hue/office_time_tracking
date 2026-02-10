import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITaskCounter {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  seq: number;
}

const TaskCounterSchema = new Schema<ITaskCounter>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true
    },
    seq: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

export const TaskCounter: Model<ITaskCounter> =
  (models.TaskCounter as Model<ITaskCounter>) ||
  model<ITaskCounter>("TaskCounter", TaskCounterSchema);

export default TaskCounter;
