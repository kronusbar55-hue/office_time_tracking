import mongoose, { Schema, model, models, type Model, type Types } from "mongoose";
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
    themePreference?: "light" | "dark" | "system";
    department?: string;
    shiftHours?: number;
    organizationId?: Types.ObjectId; // Null for Super Admin
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
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
            enum: ["ADMIN", "MANAGER", "EMPLOYEE", "SUPER_ADMIN"],
            required: true,
            default: "EMPLOYEE"
        },
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            index: true
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
            default: "ACTIVE"
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
        },
        themePreference: {
            type: String,
            enum: ["light", "dark", "system"],
            default: "system"
        },
        department: {
            type: String,
            default: "General"
        },
        shiftHours: {
            type: Number,
            default: 8
        }
    },
    {
        timestamps: true
    }
);

export const User = (models && models.User) || model<IUser>("User", UserSchema);
export default User;
