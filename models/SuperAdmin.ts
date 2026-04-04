import { Schema, model, models, type Model } from "mongoose";

export interface ISuperAdmin {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: "SUPER_ADMIN";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isActive: boolean;
  isDeleted: boolean;
}

const SuperAdminSchema = new Schema<ISuperAdmin>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["SUPER_ADMIN"], default: "SUPER_ADMIN" },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], default: "ACTIVE" },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: "users"
  }
);

export const SuperAdmin: Model<ISuperAdmin> =
  (models.SuperAdmin as Model<ISuperAdmin>) ||
  model<ISuperAdmin>("SuperAdmin", SuperAdminSchema);

export default SuperAdmin;
