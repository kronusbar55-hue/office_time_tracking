const mongoose = require('mongoose');
const uri = 'mongodb+srv://doadmin:X2NO37Us0D65Q48W@Broot-Linkedin-Test-7de8163b.mongo.ondigitalocean.com/admin?tls=true&authSource=admin';
(async () => {
  try {
    await mongoose.connect(uri, { dbName: 'office_time_tracking' });
    const db = mongoose.connection.db;
    const names = await db.listCollections().toArray();
    console.log('db', db.databaseName, 'collections', names.map(c => c.name));
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log('users', users.length, users.map(u => u.email));
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
  }
})();
