import { Schema, model, models, type Model, type Types } from "mongoose";

export type TaskType = "Task" | "Bug" | "Improvement";
export type TaskPriority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

export interface ITask {
  _id: Types.ObjectId;
  key: string;
  title: string;
  summary?: string; // alias for title
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  project: Types.ObjectId;
  assignee?: Types.ObjectId | null;
  reporter: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  reportedBy?: Types.ObjectId; // alias for reporter
  status: TaskStatus;
  dueDate?: Date | null;
  labels?: string[];
  estimatedTime?: number; // in minutes
  totalTimeSpent?: number; // in minutes
  sprint?: Types.ObjectId;
  watchers?: Types.ObjectId[];
  parentTask?: Types.ObjectId;
  childTasks?: Types.ObjectId[];
  progressPercent?: number;
  isDeleted?: boolean;
  attachments?: Array<{
    url: string;
    filename?: string;
    mimeType?: string;
    publicId?: string;
    size?: number;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ["Task", "Bug", "Improvement"],
      default: "Task",
      index: true
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
      index: true
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    status: {
      type: String,
      enum: ["backlog", "todo", "in_progress", "in_review", "done"],
      default: "backlog",
      index: true
    },
    dueDate: {
      type: Date,
      default: null
    },
    labels: {
      type: [String],
      default: []
    },
    estimatedTime: {
      type: Number,
      min: 0
    },
    totalTimeSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint"
    },
    watchers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: "Task"
    },
    childTasks: {
      type: [Schema.Types.ObjectId],
      ref: "Task",
      default: []
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    attachments: [
      {
        url: { type: String },
        filename: { type: String },
        mimeType: { type: String }
        ,publicId: { type: String },
        size: { type: Number }
      }
    ]
  },
  {
    timestamps: true
  }
);

TaskSchema.index({ project: 1, key: 1 });

export const Task: Model<ITask> =
  (models.Task as Model<ITask>) || model<ITask>("Task", TaskSchema);

