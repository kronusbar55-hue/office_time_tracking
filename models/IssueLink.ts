import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IIssueLink {
  _id: Types.ObjectId;
  sourceIssue: Types.ObjectId; // Task ID
  targetIssue: Types.ObjectId; // Task ID (can be from different project)
  sourceProject: Types.ObjectId;
  targetProject: Types.ObjectId;
  linkType: "relates_to" | "blocks" | "is_blocked_by" | "duplicates" | "clones" | "epic_to_story";
  description?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IssueLinkSchema = new Schema<IIssueLink>(
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
    sourceProject: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    targetProject: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    linkType: {
      type: String,
      enum: ["relates_to", "blocks", "is_blocked_by", "duplicates", "clones", "epic_to_story"],
      required: true,
      index: true
    },
    description: String,
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

// Ensure no duplicate links
IssueLinkSchema.index({ sourceIssue: 1, targetIssue: 1, linkType: 1 }, { unique: true });

export default models.IssueLink || model<IIssueLink>("IssueLink", IssueLinkSchema);
