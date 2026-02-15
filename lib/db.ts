import mongoose from "mongoose";

// Ensure models are registered when the module is loaded so populate() works
import "@/models/Role";
import "@/models/User";
import "@/models/Project";
import "@/models/Task";
import "@/models/TaskCounter";
import "@/models/TaskActivityLog";
import "@/models/Technology";
import "@/models/TimeEntry";
import "@/models/TimeSession";
import "@/models/TimeSessionProject";
import "@/models/TimeSessionBreak";
import "@/models/LeaveType";
import "@/models/LeaveBalance";
import "@/models/LeaveRequest";
import "@/models/LeaveAttachment";
import "@/models/AuditLog";
import "@/models/IssueWorkflow";
import "@/models/Sprint";
import "@/models/IssueCollaboration";
import "@/models/ProjectAutomation";
import "@/models/SubTask";
import "@/models/Checklist";
import "@/models/IssueDependency";
import "@/models/IssueLink";
import "@/models/SubTaskTemplate";
import "@/models/IssueHierarchy";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalWithMongoose = global as any as {
  _mongoose: MongooseGlobal | undefined;
};

let cached: MongooseGlobal = globalWithMongoose._mongoose ?? {
  conn: null,
  promise: null
};

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: process.env.MONGODB_DB_NAME || "office_time_tracking",
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  globalWithMongoose._mongoose = cached;

  return cached.conn;
}

