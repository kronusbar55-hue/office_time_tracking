import { Schema, model, models, type Model, type Types } from "mongoose";

export type AuditLogAction =
  | "clock_in"
  | "clock_out"
  | "break_start"
  | "break_end"
  | "manual_entry_create"
  | "manual_entry_update"
  | "manual_entry_delete"
  | "timesheet_approve"
  | "timesheet_reject"
  | "leave_apply"
  | "leave_approve"
  | "leave_reject"
  | "leave_cancel"
  | "leave_edit"
  | "login";

export interface IAuditLog {
  _id: Types.ObjectId;
  action: AuditLogAction;
  user: Types.ObjectId; // who performed the action
  affectedUser?: Types.ObjectId; // who was affected by the action
  entity: string; // TimeEntry, TimeSession, LeaveRequest, etc
  entityId: Types.ObjectId;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        "clock_in",
        "clock_out",
        "break_start",
        "break_end",
        "manual_entry_create",
        "manual_entry_update",
        "manual_entry_delete",
        "timesheet_approve",
        "timesheet_reject",
        "leave_apply",
        "leave_approve",
        "leave_reject",
        "leave_cancel",
        "leave_edit",
        "login"
      ]
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    affectedUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    entity: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true
    },
    oldValues: {
      type: Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: Schema.Types.Mixed,
      default: null
    },
    reason: String,
    ipAddress: String,
    userAgent: String
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ affectedUser: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ||
  model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
