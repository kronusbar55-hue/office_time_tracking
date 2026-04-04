import { Schema, model, models, type Model } from "mongoose";

export type RoleName = "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";

export interface IRole {
  _id: string;
  name: RoleName;
  description?: string;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      enum: ["ADMIN", "MANAGER", "EMPLOYEE", "SUPER_ADMIN"],
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

