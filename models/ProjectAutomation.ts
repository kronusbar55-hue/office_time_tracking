import { Schema, model, models, type Model, type Types } from "mongoose";

export type AutomationTrigger = "task_created" | "status_changed" | "assigned" | "due_soon" | "pr_merged" | "comment_added";
export type AutomationAction = 
  | "auto_assign"
  | "change_status"
  | "notify_user"
  | "add_label"
  | "change_priority"
  | "move_to_sprint"
  | "close_task"
  | "create_subtask";

export interface IAutomationRule {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: Record<string, any>[]; // dynamic conditions
  actions: {
    action: AutomationAction;
    params: Record<string, any>;
  }[];
  enabled: boolean;
  priority: number;
  createdBy: Types.ObjectId;
}

export interface IProjectRole {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  name: string; // Developer, QA, Manager, etc.
  permissions: string[]; // granular permissions
  description?: string;
  isSystem: boolean; // system roles cannot be deleted
}

export interface IProjectMemberRole {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  user: Types.ObjectId;
  roles: Types.ObjectId[]; // refs to ProjectRole
  joinedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    description: String,
    trigger: {
      type: String,
      enum: ["task_created", "status_changed", "assigned", "due_soon", "pr_merged", "comment_added"],
      required: true
    },
    conditions: [Schema.Types.Mixed],
    actions: [
      {
        action: {
          type: String,
          enum: ["auto_assign", "change_status", "notify_user", "add_label", "change_priority", "move_to_sprint", "close_task", "create_subtask"]
        },
        params: Schema.Types.Mixed
      }
    ],
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

const ProjectRoleSchema = new Schema<IProjectRole>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true },
    permissions: [String],
    description: String,
    isSystem: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const ProjectMemberRoleSchema = new Schema<IProjectMemberRole>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: "ProjectRole" }],
    joinedAt: { type: Date, default: () => new Date() }
  },
  { timestamps: true }
);

AutomationRuleSchema.index({ project: 1, enabled: 1 });
ProjectRoleSchema.index({ project: 1, name: 1 });
ProjectMemberRoleSchema.index({ project: 1, user: 1 });

export const AutomationRule: Model<IAutomationRule> =
  (models.AutomationRule as Model<IAutomationRule>) || model<IAutomationRule>("AutomationRule", AutomationRuleSchema);

export const ProjectRole: Model<IProjectRole> =
  (models.ProjectRole as Model<IProjectRole>) || model<IProjectRole>("ProjectRole", ProjectRoleSchema);

export const ProjectMemberRole: Model<IProjectMemberRole> =
  (models.ProjectMemberRole as Model<IProjectMemberRole>) || model<IProjectMemberRole>("ProjectMemberRole", ProjectMemberRoleSchema);

// Backward compatibility alias
export { AutomationRule as ProjectAutomation };
