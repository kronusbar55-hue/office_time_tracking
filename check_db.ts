import { connectDB } from "./lib/db";
import { User } from "./models/User";

async function check() {
    await connectDB();
    const count = await User.countDocuments();
    const withTenantId = await User.countDocuments({ tenantId: { $ne: null } });
    const withOwnerAdmin = await (User.collection as any).countDocuments({ ownerAdmin: { $ne: null } });
    
    const sample = await User.findOne().lean() as any;
    
  
    if (sample) {    }
    process.exit(0);
}

check();
