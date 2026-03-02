import mongoose, { Schema, model, models, type Document } from "mongoose";

export interface IEmployeeMonitor extends Document {
    userId: string;
    imageUrl: string;
    date: string; // Store as YYYY-MM-DD
    time: string; // Store as HH:mm:ss
    intervalStart: string;
    intervalEnd: string;
    mouseClicks: number;
    mouseMovements: number;
    keyPresses: number;
    activeSeconds: number;
    idleSeconds: number;
    timezone?: string;
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
        },
        intervalStart: {
            type: String,
            required: false
        },
        intervalEnd: {
            type: String,
            required: false
        },
        mouseClicks: {
            type: Number,
            default: 0
        },
        mouseMovements: {
            type: Number,
            default: 0
        },
        keyPresses: {
            type: Number,
            default: 0
        },
        activeSeconds: {
            type: Number,
            default: 0
        },
        idleSeconds: {
            type: Number,
            default: 0
        },
        timezone: {
            type: String,
            required: false
        }
    },
    {
        timestamps: true
    }
);

export const EmployeeMonitor = (models && models.EmployeeMonitor) || model<IEmployeeMonitor>("EmployeeMonitor", EmployeeMonitorSchema);
export default EmployeeMonitor;
