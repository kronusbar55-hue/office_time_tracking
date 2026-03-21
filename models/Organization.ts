import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IOrganization {
    _id: Types.ObjectId;
    name: string;
    slug: string; // for unique URL if needed
    owner: Types.ObjectId; // User ID of the primary admin
    plan: "FREE" | "PRO" | "ENTERPRISE";
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    createdAt: Date;
    updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        plan: { type: String, enum: ["FREE", "PRO", "ENTERPRISE"], default: "FREE" },
        status: { type: String, enum: ["ACTIVE", "INACTIVE", "SUSPENDED"], default: "ACTIVE" }
    },
    { timestamps: true }
);

export const Organization = (models && models.Organization) || model<IOrganization>("Organization", OrganizationSchema);
export default Organization;
