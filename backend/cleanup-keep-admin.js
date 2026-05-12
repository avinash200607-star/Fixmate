require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Provider = require("./models/Provider");
const Booking = require("./models/Booking");

async function cleanDatabaseKeepAdmin() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Delete all users EXCEPT admin
    const usersDeleted = await User.deleteMany({ role: { $ne: "admin" } });
    console.log(`✓ Deleted ${usersDeleted.deletedCount} users (kept admin)`);

    // Delete all providers
    const providersDeleted = await Provider.deleteMany({});
    console.log(`✓ Deleted ${providersDeleted.deletedCount} providers`);

    // Delete all bookings
    const bookingsDeleted = await Booking.deleteMany({});
    console.log(`✓ Deleted ${bookingsDeleted.deletedCount} bookings`);

    // Verify admin exists
    const adminUser = await User.findOne({ role: "admin" }).select("email role");
    if (adminUser) {
      console.log(`\n✓ Admin preserved: ${adminUser.email}`);
    }

    console.log("\n✅ Database cleanup complete!");
    console.log("📝 Only admin account remains");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

cleanDatabaseKeepAdmin();
