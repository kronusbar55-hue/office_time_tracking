import { Schema, model, models, type Model, type Types } from "mongoose";

export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export interface IProject {
  _id: Types.ObjectId;
  name: string;
  clientName?: string;
  description?: string;
  status: ProjectStatus;
  members: Types.ObjectId[];
  logoUrl?: string;
  color?: string;
  createdBy: Types.ObjectId;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    clientName: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["active", "on_hold", "completed", "archived"],
      default: "active",
      index: true
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    logoUrl: {
      type: String
    },
    color: {
      type: String
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

ProjectSchema.index({ name: 1 });

export const Project: Model<IProject> =
  (models.Project as Model<IProject>) ||
  model<IProject>("Project", ProjectSchema);

