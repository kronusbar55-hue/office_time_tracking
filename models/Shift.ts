import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IShift {
    _id: Types.ObjectId;
    name: string;
    startTime: string; // HH:mm format (e.g., "09:00")
    endTime: string; // HH:mm format (e.g., "18:00")
    breakDuration: number; // in minutes
    gracePeriod: number; // in minutes (for late check-in)
    isDefault: boolean; // if true, applied to users without specific assignment
    isActive: boolean;
}

const ShiftSchema = new Schema<IShift>(
    {
        name: { type: String, required: true, trim: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        breakDuration: { type: Number, default: 60 },
        gracePeriod: { type: Number, default: 15 },
        isDefault: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export const Shift: Model<IShift> =
    (models.Shift as Model<IShift>) || model<IShift>("Shift", ShiftSchema);

export default Shift;
