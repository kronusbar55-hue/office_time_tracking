import { Schema, model, models, type Model, type Types } from "mongoose";

export type ModuleName = "dashboard" | "kanban" | "projects" | "tasks" | "users" | "reports" | "settings";
export type ActionName = "view" | "create" | "edit" | "delete" | "assign";

export interface IPermission {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  module: ModuleName;
  actions: ActionName[];
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ["ADMIN", "MANAGER", "EMPLOYEE"],
      required: true
    },
    module: {
      type: String,
      enum: ["dashboard", "kanban", "projects", "tasks", "users", "reports", "settings"],
      required: true
    },
    actions: [{
      type: String,
      enum: ["view", "create", "edit", "delete", "assign"],
      required: true
    }]
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
PermissionSchema.index({ organizationId: 1, role: 1, module: 1 }, { unique: true });

export const Permission: Model<IPermission> =
  (models.Permission as Model<IPermission>) ||
  model<IPermission>("Permission", PermissionSchema);

export default Permission;