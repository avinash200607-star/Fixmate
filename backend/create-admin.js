require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const adminEmail = "admin@fixmate.com";
    const adminPassword = "Admin@123456"; // Change this to something strong
    const adminName = "FixMate Admin";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log("⚠️  Admin already exists with this email");
      process.exit(0);
    }

    // Create admin (User model will hash password in pre-save hook)
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: "admin"
    });

    console.log("✓ Admin created successfully!");
    console.log(`📧 Email: ${admin.email}`);
    console.log(`🔐 Password: ${adminPassword}`);
    console.log(`👤 Role: ${admin.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createAdmin();
