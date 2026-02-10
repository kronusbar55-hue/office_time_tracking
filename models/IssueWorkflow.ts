import { Schema, model, models, type Model, type Types } from "mongoose";

export type IssueTypeEnum = "epic" | "story" | "task" | "subtask" | "bug" | "improvement" | "custom";
export type WorkflowTransition = {
  fromStatus: string;
  toStatus: string;
  allowedRoles: string[];
  autoActions?: {
    notify?: boolean;
    changeAssignee?: Types.ObjectId | null;
    updateFields?: Record<string, any>;
  };
};

export interface IIssueType {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  isSystem: boolean; // system types like Task, Bug cannot be deleted
  hierarchy: number; // 0=Epic, 1=Story, 2=Task, 3=Subtask
}

export interface IStatus {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  color?: string;
  category: "todo" | "inProgress" | "done" | "blocked";
  sortOrder: number;
}

export interface IWorkflow {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  description?: string;
  statuses: Types.ObjectId[]; // refs to Status
  transitions: WorkflowTransition[];
  isDefault: boolean;
}

const IssueTypeSchema = new Schema<IIssueType>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    label: { type: String, required: true },
    description: String,
    icon: String,
    color: String,
    isSystem: { type: Boolean, default: false },
    hierarchy: { type: Number, default: 2 }
  },
  { timestamps: true }
);

const StatusSchema = new Schema<IStatus>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    color: { type: String, default: "#4a5568" },
    category: {
      type: String,
      enum: ["todo", "inProgress", "done", "blocked"],
      default: "todo"
    },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const WorkflowSchema = new Schema<IWorkflow>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    description: String,
    statuses: [{ type: Schema.Types.ObjectId, ref: "Status" }],
    transitions: [
      {
        fromStatus: String,
        toStatus: String,
        allowedRoles: [String],
        autoActions: {
          notify: Boolean,
          changeAssignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
          updateFields: Schema.Types.Mixed
        }
      }
    ],
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

IssueTypeSchema.index({ project: 1, name: 1 });
StatusSchema.index({ project: 1, category: 1 });
WorkflowSchema.index({ project: 1, isDefault: 1 });

export const IssueType: Model<IIssueType> =
  (models.IssueType as Model<IIssueType>) || model<IIssueType>("IssueType", IssueTypeSchema);

export const Status: Model<IStatus> =
  (models.Status as Model<IStatus>) || model<IStatus>("Status", StatusSchema);

export const Workflow: Model<IWorkflow> =
  (models.Workflow as Model<IWorkflow>) || model<IWorkflow>("Workflow", WorkflowSchema);
