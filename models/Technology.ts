import { Schema, model, models, type Model, type Types } from "mongoose";

export type TechnologyStatus = "active" | "inactive";

export interface ITechnology {
  _id: Types.ObjectId;
  name: string;
  status: TechnologyStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const TechnologySchema = new Schema<ITechnology>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Technology: Model<ITechnology> =
  (models.Technology as Model<ITechnology>) || model<ITechnology>("Technology", TechnologySchema);

export default Technology;
