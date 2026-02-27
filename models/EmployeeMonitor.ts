import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IEmployeeMonitor extends Document {
    userId: string;
    imageUrl: string;
    date: string; // Store as YYYY-MM-DD
    time: string; // Store as HH:mm:ss
    createdAt: Date;
    updatedAt: Date;
}

const EmployeeMonitorSchema = new Schema<IEmployeeMonitor>(
    {
        userId: {
            type: String,
            required: true,
            index: true
        },
        imageUrl: {
            type: String,
            required: true
        },
        date: {
            type: String,
            required: true,
            index: true
        },
        time: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

export const EmployeeMonitor = (models && models.EmployeeMonitor) || model<IEmployeeMonitor>("EmployeeMonitor", EmployeeMonitorSchema);
export default EmployeeMonitor;
