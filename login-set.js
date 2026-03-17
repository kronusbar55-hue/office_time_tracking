const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
(async () => {
  const uri = "mongodb+srv://doadmin:X2NO37Us0D65Q48W@Broot-Linkedin-Test-7de8163b.mongo.ondigitalocean.com/admin?tls=true&authSource=admin";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("office_time_tracking");
  const hash = await bcrypt.hash("Admin@1234", 10);
  await db.collection("users").updateOne({ email: "admin.technotoil@gmail.com" }, { $set: { passwordHash: hash } });
  const u = await db.collection("users").findOne({ email: "admin.technotoil@gmail.com" });
  console.log("updated", u ? u.passwordHash : "not found");
  await client.close();
})();
