const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const Provider = require("../models/Provider");

const router = express.Router();
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const normalizeRole = (role) => (role === "provider" || role === "admin" ? role : "user");

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, serviceTypes, googleId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, and password are required." });
    }

    const normalizedRole = normalizeRole(role);
    if (normalizedRole === "provider" && (!serviceTypes || serviceTypes.length === 0)) {
      return res.status(400).json({ message: "Please select at least one service type." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists. Please login instead." });
    }

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password,
      role: normalizedRole,
      googleId: googleId || null,
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET || "super_secret_dev_key_12345",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        googleId: newUser.googleId,
        serviceType: normalizedRole === "provider" ? serviceTypes.join(", ") : null,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to create account." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const normalizedRole = normalizeRole(role);
    const user = await User.findOne({ email: email.toLowerCase(), role: normalizedRole }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials for selected role." });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let provider = null;
    if (normalizedRole === "provider") {
      provider = await Provider.findOne({ userId: user._id });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "super_secret_dev_key_12345",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceType: provider?.serviceTypes ? provider.serviceTypes.join(", ") : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login." });
  }
});

// POST /api/auth/admin/login
router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase(), role: "admin" }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid admin credentials." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "super_secret_dev_key_12345",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Admin login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Failed to login." });
  }
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
  try {
    const { token, role, serviceTypes } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token is required." });
    }

    if (!googleClient) {
      return res.status(500).json({
        message: "Google auth is not configured. Set GOOGLE_CLIENT_ID in your environment.",
      });
    }

    const normalizedRole = normalizeRole(role);
    if (normalizedRole === "provider" && (!serviceTypes || serviceTypes.length === 0)) {
      return res.status(400).json({
        message: "Please select at least one service type for provider signup.",
      });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: googleClientId });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const name = payload?.name || "User";

    if (!email) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = new User({
        name,
        email,
        password: randomPassword,
        role: normalizedRole,
        googleId: payload?.sub || null,
      });
      await user.save();
    }

    let provider = null;
    if (normalizedRole === "provider") {
      provider = await Provider.findOne({ userId: user._id });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "super_secret_dev_key_12345",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Google authentication successful.",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceType: provider?.serviceTypes ? provider.serviceTypes.join(", ") : null,
        profilePicture: payload?.picture || null,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Return generic success even if user doesn't exist (security best practice)
    if (!user) {
      return res.json({ message: "If this email exists, a reset link has been generated." });
    }

    const resetToken = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Store reset token temporarily in memory or Redis in production
    // For now, we'll include it in the response (not ideal for production)
    res.json({
      message: "Password reset link generated.",
      resetLink: `/reset-password.html?token=${resetToken}`,
      token: resetToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to generate reset link." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and newPassword are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    // In production, validate token from Redis or database
    // For now, this is a placeholder
    res.json({ message: "Password reset successful. Please login." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

// DEBUG: GET /api/auth/check-admin (Verify admin exists)
router.get("/check-admin", async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" }).select("+password");
    
    if (!admin) {
      return res.json({ exists: false, message: "No admin user found in database" });
    }

    // Test password
    const passwordMatch = await admin.comparePassword("admin123");
    
    res.json({
      exists: true,
      email: admin.email,
      name: admin.name,
      defaultPasswordWorks: passwordMatch,
      message: passwordMatch ? "✓ Admin can login with admin@fixmate.com / admin123" : "✗ Default password doesn't match"
    });
  } catch (error) {
    console.error("Check admin error:", error);
    res.status(500).json({ error: error.message });
  }
});

// DEBUG: POST /api/auth/reset-admin-password (Reset admin password to admin123)
router.post("/reset-admin-password", async (req, res) => {
  try {
    const admin = await User.findOne({ role: "admin" });
    
    if (!admin) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    // Update password - will be hashed by pre-save hook
    admin.password = "admin123";
    await admin.save();

    res.json({
      message: "✓ Admin password reset to: admin123",
      email: "admin@fixmate.com",
      password: "admin123"
    });
  } catch (error) {
    console.error("Reset admin password error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
