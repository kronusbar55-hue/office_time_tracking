import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IEmployeeShift {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    shift: Types.ObjectId;
    startDate: Date;
    endDate?: Date; // null means indefinitely active
    isActive: boolean;
}

const EmployeeShiftSchema = new Schema<IEmployeeShift>(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        shift: { type: Schema.Types.ObjectId, ref: "Shift", required: true },
        startDate: { type: Date, required: true, default: Date.now },
        endDate: { type: Date, default: null },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Ensure a user has only one active shift assignment at a time (soft constraint, handled by logic usually)
EmployeeShiftSchema.index({ user: 1, isActive: 1 });

export const EmployeeShift: Model<IEmployeeShift> =
    (models.EmployeeShift as Model<IEmployeeShift>) ||
    model<IEmployeeShift>("EmployeeShift", EmployeeShiftSchema);

export default EmployeeShift;
