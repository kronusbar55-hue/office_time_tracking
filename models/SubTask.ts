import { Schema, model, models, type Model, type Types } from "mongoose";

export type SubTaskStatus = "todo" | "in_progress" | "in_review" | "done" | "blocked";
export type SubTaskPriority = "low" | "medium" | "high" | "critical";

export interface ISubTask {
  _id: Types.ObjectId;
  key: string;
  title: string;
  description?: string;
  parentTask: Types.ObjectId;
  parentIssueType: "epic" | "story" | "task"; // Type of direct parent
  assignee?: Types.ObjectId;
  reporter: Types.ObjectId;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  status: SubTaskStatus;
  priority: SubTaskPriority;
  dueDate?: Date;
  estimatedTime?: number; // in minutes
  loggedTime?: number; // in minutes
  loggedHours?: number; // calculated from loggedTime
  progressPercent?: number;
  checklist?: Types.ObjectId; // ref to Checklist if exists
  attachments?: Array<{
    url: string;
    filename: string;
    mimeType: string;
    uploadedBy: Types.ObjectId;
    uploadedAt: Date;
  }>;
  watchers?: Types.ObjectId[];
  labels?: string[];
  isDeleted?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubTaskSchema = new Schema<ISubTask>(
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
    description: String,
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true
    },
    parentIssueType: {
      type: String,
      enum: ["epic", "story", "task"],
      required: true
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User"
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
      enum: ["todo", "in_progress", "in_review", "done", "blocked"],
      default: "todo",
      index: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true
    },
    dueDate: Date,
    estimatedTime: {
      type: Number,
      min: 0
    },
    loggedTime: {
      type: Number,
      default: 0,
      min: 0
    },
    loggedHours: {
      type: Number,
      default: 0,
      min: 0
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    checklist: {
      type: Schema.Types.ObjectId,
      ref: "Checklist"
    },
    attachments: [
      {
        url: String,
        filename: String,
        mimeType: String,
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: "User"
        },
        uploadedAt: {
          type: Date,
          default: () => new Date()
        }
      }
    ],
    watchers: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: []
    },
    labels: {
      type: [String],
      default: []
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Calculate loggedHours from loggedTime
SubTaskSchema.pre("save", function (next) {
  if (this.loggedTime) {
    this.loggedHours = Math.round((this.loggedTime / 60) * 10) / 10;
  }
  next();
});

// Indexes for common queries
SubTaskSchema.index({ parentTask: 1, status: 1 });
SubTaskSchema.index({ assignee: 1, status: 1 });
SubTaskSchema.index({ parentTask: 1, parentIssueType: 1 });

export default models.SubTask || model<ISubTask>("SubTask", SubTaskSchema);
