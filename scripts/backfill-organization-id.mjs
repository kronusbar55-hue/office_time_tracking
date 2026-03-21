import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is required");

await mongoose.connect(MONGODB_URI);

const User = mongoose.connection.collection("users");
const TimeSessions = mongoose.connection.collection("timesessions");
const CheckInOut = mongoose.connection.collection("checkinouts");
const TimeEntries = mongoose.connection.collection("timeentries");
const WorkLogs = mongoose.connection.collection("worklogs");

async function backfillCollection(coll, userField) {
  const docs = await coll.find({ organizationId: { $exists: false } }).toArray();
  for (const doc of docs) {
    const userId = doc[userField];
    if (!userId) continue;
    const user = await User.findOne({ _id: userId }, { projection: { organizationId: 1 } });
    if (!user?.organizationId) continue;
    await coll.updateOne({ _id: doc._id }, { $set: { organizationId: user.organizationId } });
  }
  console.log(`Backfilled ${docs.length} docs in ${coll.collectionName}`);
}

await backfillCollection(TimeSessions, "user");
await backfillCollection(CheckInOut, "user");
await backfillCollection(TimeEntries, "user");
await backfillCollection(WorkLogs, "user");

await mongoose.disconnect();
console.log("Backfill complete.");

