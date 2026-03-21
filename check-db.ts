import mongoose from "mongoose";
import { connectDB } from "./lib/db";
import { User } from "./models/User";

async function check() {
  await connectDB();
  const email = "admin.pk@technotoil.com";
  const user = await User.findOne({ email });
  console.log("Checking for user:", email);
  if (user) {
    console.log("USER FOUND:", { email: user.email, role: user.role, status: user.status, isActive: user.isActive });
  } else {
    console.log("USER NOT FOUND");
  }
  process.exit(0);
}

check();
