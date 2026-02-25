import { Schema, model, models, type Model } from "mongoose";

export type RoleName = "admin" | "manager" | "employee" | "hr";

export interface IRole {
  _id: string;
  name: RoleName;
  description?: string;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      enum: ["admin", "manager", "employee", "hr"],
      required: true,
      unique: true
    },
    description: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export const Role: Model<IRole> =
  (models.Role as Model<IRole>) || model<IRole>("Role", RoleSchema);

