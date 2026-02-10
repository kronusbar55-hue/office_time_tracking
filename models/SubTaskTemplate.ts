import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ISubTaskTemplate {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  description?: string;
  triggeredBy: "task_created" | "epic_created" | "story_created" | "manual";
  taskTypeFilter?: "epic" | "story" | "task" | "bug" | "improvement"; // Only apply when this type is created
  subtasks: Array<{
    title: string;
    description?: string;
    priority: "low" | "medium" | "high" | "critical";
    estimatedMinutes?: number;
    order: number;
  }>;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SubTaskTemplateSchema = new Schema<ISubTaskTemplate>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    triggeredBy: {
      type: String,
      enum: ["task_created", "epic_created", "story_created", "manual"],
      default: "manual",
      index: true
    },
    taskTypeFilter: {
      type: String,
      enum: ["epic", "story", "task", "bug", "improvement"]
    },
    subtasks: [
      {
        title: {
          type: String,
          required: true
        },
        description: String,
        priority: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium"
        },
        estimatedMinutes: Number,
        order: Number
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
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

export default models.SubTaskTemplate ||
  model<ISubTaskTemplate>("SubTaskTemplate", SubTaskTemplateSchema);
