require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Provider = require("./models/Provider");
const Booking = require("./models/Booking");

async function cleanDatabase() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Delete all users except admin
    const usersDeleted = await User.deleteMany({ role: { $ne: "admin" } });
    console.log(`✓ Deleted ${usersDeleted.deletedCount} users`);

    // Delete all providers
    const providersDeleted = await Provider.deleteMany({});
    console.log(`✓ Deleted ${providersDeleted.deletedCount} providers`);

    // Try to delete all bookings if collection exists
    try {
      const bookingsDeleted = await Booking.deleteMany({});
      console.log(`✓ Deleted ${bookingsDeleted.deletedCount} bookings`);
    } catch (err) {
      console.log("⚠️  Bookings collection not found or error deleting");
    }

    console.log("\n✓ Database cleaned successfully!");
    console.log("📝 Admin account preserved for testing");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

cleanDatabase();
