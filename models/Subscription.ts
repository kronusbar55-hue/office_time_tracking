import { Schema, model, models, type Types, type Model } from "mongoose";

export interface ISubscription {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "INACTIVE" | "CANCELLED";
  priceMonthly: number;
  startsAt: Date;
  endsAt?: Date | null;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    plan: {
      type: String,
      enum: ["FREE", "PRO", "ENTERPRISE"],
      default: "FREE"
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "CANCELLED"],
      default: "ACTIVE",
      index: true
    },
    priceMonthly: {
      type: Number,
      default: 0
    },
    startsAt: {
      type: Date,
      default: Date.now
    },
    endsAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

SubscriptionSchema.index({ organizationId: 1, status: 1 });

export const Subscription: Model<ISubscription> =
  (models.Subscription as Model<ISubscription>) ||
  model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;

