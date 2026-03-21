import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./lib/db";
import { User } from "./models/User";

async function seedSuperAdmin() {
  await connectDB();
  
  const email = "admin.pk@technotoil.com";
  const password = "PK@12345";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Super Admin already exists.");
    process.exit(0);
  }

  await User.create({
    firstName: "PK",
    lastName: "Admin",
    email,
    passwordHash,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    isActive: true,
    isDeleted: false
  });

  console.log("Super Admin seeded successfully!");
  process.exit(0);
}

seedSuperAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
