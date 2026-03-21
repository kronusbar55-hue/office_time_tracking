import { Schema, model, models, type Types, type Model } from "mongoose";

export interface IUserSession {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  organizationId?: Types.ObjectId | null;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  revokedAt?: Date | null;
}

const UserSessionSchema = new Schema<IUserSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
    tokenHash: { type: String, required: true, index: true },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

UserSessionSchema.index({ user: 1, revokedAt: 1, expiresAt: 1 });

export const UserSession: Model<IUserSession> =
  (models.UserSession as Model<IUserSession>) ||
  model<IUserSession>("UserSession", UserSessionSchema);

export default UserSession;

