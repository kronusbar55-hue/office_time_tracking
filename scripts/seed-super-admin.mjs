import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is required");
}

await mongoose.connect(MONGODB_URI);

const UserSchema = new mongoose.Schema({}, { strict: false, collection: "users" });
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const email = "admin.pk@technotoil.com";
const passwordHash = await bcrypt.hash("PK@12345", 10);

const existing = await User.findOne({ email }).lean();
if (existing) {
  await User.updateOne(
    { _id: existing._id },
    {
      $set: {
        firstName: existing.firstName || "Platform",
        lastName: existing.lastName || "Admin",
        role: "SUPER_ADMIN",
        organizationId: null,
        status: "ACTIVE",
        isActive: true,
        isDeleted: false,
        passwordHash
      }
    }
  );
  console.log("Updated existing super admin:", email);
} else {
  await User.create({
    firstName: "Platform",
    lastName: "Admin",
    email,
    passwordHash,
    role: "SUPER_ADMIN",
    organizationId: null,
    status: "ACTIVE",
    isActive: true,
    isDeleted: false
  });
  console.log("Created super admin:", email);
}

await mongoose.disconnect();

