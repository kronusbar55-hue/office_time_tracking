import mongoose, { Schema, model, models, type Model, type Types } from "mongoose";

export interface ITenantSettings {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSettingsSchema = new Schema<ITenantSettings>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    cloudinary: {
      cloudName: { type: String, default: "" },
      apiKey: { type: String, default: "" },
      apiSecret: { type: String, default: "" },
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const TenantSettings =
  (models && models.TenantSettings) ||
  model<ITenantSettings>("TenantSettings", TenantSettingsSchema);

export default TenantSettings;
