require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const User = require("./models/User");

// Import routes
const authRoutes = require("./routes/auth");
const providersRoutes = require("./routes/providers");
const bookingsRoutes = require("./routes/bookings");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================
// Middleware Setup
// ========================

// ✅ FIXED CORS (IMPORTANT)
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.FRONTEND_URL || "*"
        : "*",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
const publicDir = path.join(__dirname, "..", "frontend", "public");
app.use(express.static(publicDir));

// File uploads configuration
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9_-]/g, "");
      cb(null, `${Date.now()}-${name}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ========================
// API Routes
// ========================

app.get("/api/config", (_req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

app.use("/api/auth", authRoutes);
app.use("/api/providers", providersRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/admin", adminRoutes);

// ========================
// Frontend Routes
// ========================

app.get("/auth", (_req, res) =>
  res.sendFile(path.join(publicDir, "auth.html"))
);
app.get("/forgot-password", (_req, res) =>
  res.sendFile(path.join(publicDir, "forgot-password.html"))
);
app.get("/reset-password", (_req, res) =>
  res.sendFile(path.join(publicDir, "reset-password.html"))
);
app.get("/admin-login", (_req, res) =>
  res.sendFile(path.join(publicDir, "admin-login.html"))
);
app.get("/admin-panel", (_req, res) =>
  res.sendFile(path.join(publicDir, "admin-panel.html"))
);
app.get("/provider-dashboard", (_req, res) =>
  res.sendFile(path.join(publicDir, "provider-dashboard.html"))
);
app.get("/provider-profile", (_req, res) =>
  res.sendFile(path.join(publicDir, "provider-profile.html"))
);
app.get("/provider-bookings", (_req, res) =>
  res.sendFile(path.join(publicDir, "provider-bookings.html"))
);
app.get("/user-bookings", (_req, res) =>
  res.sendFile(path.join(publicDir, "user-bookings.html"))
);
app.get("/booking", (_req, res) =>
  res.sendFile(path.join(publicDir, "booking.html"))
);

// ========================
// Error Handling
// ========================

app.use((err, _req, res, _next) => {
  console.error("Error:", err.message);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size exceeds 5MB limit." });
    }
  }

  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(500).json({ message });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ========================
// Start Server
// ========================

const startServer = async () => {
  try {
    await connectDB();

    // Create default admin if not exists
    const adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      const hash = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "FixMate Admin",
        email: "admin@fixmate.com",
        password: hash,
        role: "admin",
      });
      console.log("✓ Default admin created");
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("✗ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;