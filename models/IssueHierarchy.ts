import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Maps the complete hierarchy for an issue
 * Helps with quick lookups and rollup calculations
 */
export interface IIssueHierarchy {
  _id: Types.ObjectId;
  epic?: Types.ObjectId; // Top-level epic, if part of one
  story?: Types.ObjectId; // Story in hierarchy, if part of one
  task?: Types.ObjectId; // Task in hierarchy, if part of one
  issue: Types.ObjectId; // The actual issue (can be any level)
  issueType: "epic" | "story" | "task" | "subtask";
  level: 1 | 2 | 3 | 4; // 1=epic, 2=story, 3=task, 4=subtask
  totalSubTasks: number;
  completedSubTasks: number;
  progressPercent: number; // Auto-calculated
  createdAt: Date;
  updatedAt: Date;
}

const IssueHierarchySchema = new Schema<IIssueHierarchy>(
  {
    epic: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      index: true
    },
    story: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      index: true
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "SubTask",
      index: true
    },
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      unique: true,
      index: true
    },
    issueType: {
      type: String,
      enum: ["epic", "story", "task", "subtask"],
      required: true,
      index: true
    },
    level: {
      type: Number,
      enum: [1, 2, 3, 4],
      required: true,
      index: true
    },
    totalSubTasks: {
      type: Number,
      default: 0
    },
    completedSubTasks: {
      type: Number,
      default: 0
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

// Index for quick hierarchy lookups
IssueHierarchySchema.index({ epic: 1, story: 1, task: 1 });
IssueHierarchySchema.index({ epic: 1, issueType: 1 });
IssueHierarchySchema.index({ story: 1, issueType: 1 });

export default models.IssueHierarchy ||
  model<IIssueHierarchy>("IssueHierarchy", IssueHierarchySchema);
