import mongoose, { Schema, model, models, type Model, type Types } from "mongoose";

export interface IAnnouncement {
    _id: Types.ObjectId;
    title: string;
    description: string;
    category: 'General' | 'HR' | 'Policy' | 'Event' | 'Urgent';
    isPinned: boolean;
    createdBy: Types.ObjectId;
    isActive: boolean;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        category: {
            type: String,
            enum: ['General', 'HR', 'Policy', 'Event', 'Urgent'],
            default: 'General',
            index: true
        },
        isPinned: {
            type: Boolean,
            default: false,
            index: true
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        expiresAt: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

AnnouncementSchema.index({ createdAt: -1 });

export const Announcement: Model<IAnnouncement> =
    (models.Announcement as Model<IAnnouncement>) || model<IAnnouncement>("Announcement", AnnouncementSchema);
