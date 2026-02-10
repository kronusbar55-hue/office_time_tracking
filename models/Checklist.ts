import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IChecklistItem {
  _id: Types.ObjectId;
  title: string;
  completed: boolean;
  assignee?: Types.ObjectId;
  dueDate?: Date;
  order: number;
}

export interface IChecklist {
  _id: Types.ObjectId;
  issue: Types.ObjectId;
  items: IChecklistItem[];
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItem>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    dueDate: Date,
    order: Number
  },
  { _id: true }
);

const ChecklistSchema = new Schema<IChecklist>(
  {
    issue: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      unique: true,
      index: true
    },
    items: {
      type: [ChecklistItemSchema],
      default: []
    },
    totalItems: {
      type: Number,
      default: 0
    },
    completedItems: {
      type: Number,
      default: 0
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

// Update progress when items change
ChecklistSchema.pre("save", function (next) {
  this.totalItems = this.items?.length || 0;
  this.completedItems = this.items?.filter((item) => item.completed).length || 0;
  this.progressPercent =
    this.totalItems > 0
      ? Math.round((this.completedItems / this.totalItems) * 100)
      : 0;
  next();
});

export default models.Checklist || model<IChecklist>("Checklist", ChecklistSchema);
