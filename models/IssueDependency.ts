import { Schema, model, models, type Model, type Types } from "mongoose";

export type DependencyType = "blocks" | "is_blocked_by" | "relates_to" | "duplicates" | "clones" | "depends_on";

export interface IIssueDependency {
  _id: Types.ObjectId;
  sourceIssue: Types.ObjectId; // The issue that has the dependency (e.g., "A blocks B" → sourceIssue: A)
  targetIssue: Types.ObjectId; // The issue being blocked/related
  type: DependencyType;
  description?: string;
  status: "active" | "resolved"; // active = dependency still exists, resolved = no longer a blocker
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IssueDependencySchema = new Schema<IIssueDependency>(
  {
    sourceIssue: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true
    },
    targetIssue: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["blocks", "is_blocked_by", "relates_to", "duplicates", "clones", "depends_on"],
      required: true,
      index: true
    },
    description: String,
    status: {
      type: String,
      enum: ["active", "resolved"],
      default: "active",
      index: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure no duplicate dependencies
IssueDependencySchema.index({ sourceIssue: 1, targetIssue: 1, type: 1 }, { unique: true });

export default models.IssueDependency ||
  model<IIssueDependency>("IssueDependency", IssueDependencySchema);
