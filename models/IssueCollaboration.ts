import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IIssueComment {
  _id: Types.ObjectId;
  issue: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  mentions: Types.ObjectId[]; // @mentioned users
  attachments: Types.ObjectId[];
  parentComment?: Types.ObjectId | null; // for threaded replies
  likes: Types.ObjectId[];
  isEdited: boolean;
  editedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIssueAttachment {
  _id: Types.ObjectId;
  issue: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ITimeLog {
  _id: Types.ObjectId;
  issue: Types.ObjectId;
  user: Types.ObjectId;
  timeSpent: number; // in minutes
  description?: string;
  loggedDate: string; // YYYY-MM-DD
  isBillable: boolean;
  startTime?: Date | null;
  endTime?: Date | null;
}

export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  issuer: Types.ObjectId;
  type: "task_assigned" | "status_changed" | "comment_added" | "mentioned" | "due_soon" | "sprint_started" | "custom";
  entity: "task" | "issue" | "sprint" | "project" | "comment";
  entityId: Types.ObjectId;
  title: string;
  message: string;
  relatedUrl?: string;
  read: boolean;
  readAt?: Date | null;
  channels: ("email" | "in_app" | "push" | "slack" | "teams")[];
}

const IssueCommentSchema = new Schema<IIssueComment>(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    attachments: [{ type: Schema.Types.ObjectId, ref: "IssueAttachment" }],
    parentComment: { type: Schema.Types.ObjectId, ref: "IssueComment", default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

const IssueAttachmentSchema = new Schema<IIssueAttachment>(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedAt: { type: Date, default: () => new Date() }
  }
);

const TimeLogSchema = new Schema<ITimeLog>(
  {
    issue: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    timeSpent: { type: Number, required: true }, // minutes
    description: String,
    loggedDate: { type: String, required: true, index: true },
    isBillable: { type: Boolean, default: true },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null }
  },
  { timestamps: true }
);

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    issuer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["task_assigned", "status_changed", "comment_added", "mentioned", "due_soon", "sprint_started", "custom"],
      required: true
    },
    entity: {
      type: String,
      enum: ["task", "issue", "sprint", "project", "comment"],
      required: true
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedUrl: String,
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    channels: [{ type: String, enum: ["email", "in_app", "push", "slack", "teams"] }]
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

IssueCommentSchema.index({ issue: 1, createdAt: -1 });
TimeLogSchema.index({ user: 1, loggedDate: 1 });
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const IssueComment: Model<IIssueComment> =
  (models.IssueComment as Model<IIssueComment>) || model<IIssueComment>("IssueComment", IssueCommentSchema);

export const IssueAttachment: Model<IIssueAttachment> =
  (models.IssueAttachment as Model<IIssueAttachment>) || model<IIssueAttachment>("IssueAttachment", IssueAttachmentSchema);

export const TimeLog: Model<ITimeLog> =
  (models.TimeLog as Model<ITimeLog>) || model<ITimeLog>("TimeLog", TimeLogSchema);

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) || model<INotification>("Notification", NotificationSchema);
