import { Schema, model, models, type Model, type Types } from "mongoose";

export type ActivityEventType =
  | "TASK_CREATED"
  | "STATUS_CHANGED"
  | "ASSIGNEE_CHANGED"
  | "PRIORITY_CHANGED"
  | "DESCRIPTION_EDITED"
  | "IMAGES_ADDED"
  | "IMAGES_REMOVED"
  | "COMMENT_ADDED"
  | "TIME_LOGGED"
  | "FIELD_CHANGED"
  | "DUEDATE_CHANGED"
  | "LABELS_CHANGED"
  | "TYPE_CHANGED";

export interface IFieldChange {
  fieldName: string;
  oldValue?: any;
  newValue?: any;
  displayOldValue?: string;
  displayNewValue?: string;
}

export interface ITaskActivityLog {
  _id: Types.ObjectId;
  task: Types.ObjectId;
  user?: Types.ObjectId;
  eventType: ActivityEventType;
  fieldChanges?: IFieldChange[];
  description?: string;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

const TaskActivityLogSchema = new Schema<ITaskActivityLog>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    eventType: {
      type: String,
      enum: [
        "TASK_CREATED",
        "STATUS_CHANGED",
        "ASSIGNEE_CHANGED",
        "PRIORITY_CHANGED",
        "DESCRIPTION_EDITED",
        "IMAGES_ADDED",
        "IMAGES_REMOVED",
        "COMMENT_ADDED",
        "TIME_LOGGED",
        "FIELD_CHANGED",
        "DUEDATE_CHANGED",
        "LABELS_CHANGED",
        "TYPE_CHANGED"
      ],
      required: true,
      index: true
    },
    fieldChanges: [
      {
        fieldName: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        displayOldValue: String,
        displayNewValue: String
      }
    ],
    description: String,
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

export const TaskActivityLog: Model<ITaskActivityLog> =
  (models.TaskActivityLog as Model<ITaskActivityLog>) ||
  model<ITaskActivityLog>("TaskActivityLog", TaskActivityLogSchema);

export default TaskActivityLog;
