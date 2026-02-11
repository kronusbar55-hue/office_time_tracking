import { Schema, model, models, type Model, type Types } from "mongoose";
import type { RoleName } from "./Role";

export interface IUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  manager?: Types.ObjectId | null;
  technology?: Types.ObjectId | null;
  joinDate?: Date;
  avatarUrl?: string;
  avatarPublicId?: string;
  avatarSize?: number;
  isActive: boolean;
  isDeleted: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ["admin", "manager", "employee", "hr"],
      required: true,
      default: "employee"
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    technology: {
      type: Schema.Types.ObjectId,
      ref: "Technology",
      default: null,
      index: true
    },
    joinDate: {
      type: Date
    },
    avatarUrl: {
      type: String
    },
    avatarPublicId: {
      type: String
    },
    avatarSize: {
      type: Number
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

