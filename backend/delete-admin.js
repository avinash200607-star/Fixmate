require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function deleteAdmin() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const result = await User.deleteOne({ email: "admin@fixmate.com" });
    
    if (result.deletedCount > 0) {
      console.log("✓ Old admin deleted");
    } else {
      console.log("⚠️  No admin found to delete");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

deleteAdmin();
