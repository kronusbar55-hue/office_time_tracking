import { Schema, model, models, type Model, type Types } from "mongoose";

export type SprintStatus = "planning" | "active" | "completed" | "cancelled";

export interface ISprint {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  goal?: string;
  status: SprintStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  issues: Types.ObjectId[]; // refs to Task/Issue
  capacity?: number; // story points capacity
  velocity?: number; // completed story points
  completedAt?: Date | null;
  createdBy: Types.ObjectId;
}

export interface IBoard {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  type: "kanban" | "scrum";
  sprint?: Types.ObjectId | null; // for scrum boards
  columns: {
    name: string;
    statusId: Types.ObjectId;
    wipLimit?: number;
    issues: Types.ObjectId[];
  }[];
  filters?: Record<string, any>;
  createdBy: Types.ObjectId;
}

const SprintSchema = new Schema<ISprint>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    goal: String,
    status: {
      type: String,
      enum: ["planning", "active", "completed", "cancelled"],
      default: "planning",
      index: true
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    issues: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    capacity: { type: Number, default: 0 },
    velocity: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const BoardSchema = new Schema<IBoard>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["kanban", "scrum"], required: true },
    sprint: { type: Schema.Types.ObjectId, ref: "Sprint", default: null },
    columns: [
      {
        name: String,
        statusId: { type: Schema.Types.ObjectId, ref: "Status" },
        wipLimit: Number,
        issues: [{ type: Schema.Types.ObjectId, ref: "Task" }]
      }
    ],
    filters: Schema.Types.Mixed,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

SprintSchema.index({ project: 1, status: 1 });
SprintSchema.index({ project: 1, startDate: 1, endDate: 1 });
BoardSchema.index({ project: 1, type: 1 });

export const Sprint: Model<ISprint> =
  (models.Sprint as Model<ISprint>) || model<ISprint>("Sprint", SprintSchema);

export const Board: Model<IBoard> =
  (models.Board as Model<IBoard>) || model<IBoard>("Board", BoardSchema);
