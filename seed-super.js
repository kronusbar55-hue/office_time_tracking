const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = "mongodb+srv://doadmin:X2NO37Us0D65Q48W@Broot-Linkedin-Test-7de8163b.mongo.ondigitalocean.com/admin?tls=true&authSource=admin";

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'office_time_tracking' });

    const UserSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      passwordHash: String,
      role: String,
      isActive: Boolean,
      isDeleted: Boolean
    }, { timestamps: true, collection: 'users' });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const email = "super.admin@technotoil.com";
    const password = "SuperAdmin@1212";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Super Admin already exists");
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      await User.create({
        firstName: "Technotoil",
        lastName: "SuperAdmin",
        email,
        passwordHash,
        role: "super-admin",
        isActive: true,
        isDeleted: false
      });
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
