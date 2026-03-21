import { Schema, model, models, type Types, type Model } from "mongoose";

export interface IOrganizationInvite {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  role: "admin" | "manager" | "employee" | "hr";
  invitedBy: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
}

const OrganizationInviteSchema = new Schema<IOrganizationInvite>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["admin", "manager", "employee", "hr"], default: "employee" },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

OrganizationInviteSchema.index({ organizationId: 1, email: 1, acceptedAt: 1 });

export const OrganizationInvite: Model<IOrganizationInvite> =
  (models.OrganizationInvite as Model<IOrganizationInvite>) ||
  model<IOrganizationInvite>("OrganizationInvite", OrganizationInviteSchema);

export default OrganizationInvite;

