import { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITaskAuditLog {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  actionType: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  changedBy?: Types.ObjectId;
  changedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

const TaskAuditLogSchema = new Schema<ITaskAuditLog>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    actionType: { type: String, required: true, index: true },
    fieldName: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    changedByRole: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

export const TaskAuditLog: Model<ITaskAuditLog> =
  (models.TaskAuditLog as Model<ITaskAuditLog>) || model<ITaskAuditLog>("TaskAuditLog", TaskAuditLogSchema);

export default TaskAuditLog;
