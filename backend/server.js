const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const { OAuth2Client } = require("google-auth-library");
const { db, run, get, all, initializeDb } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const publicDir = path.join(__dirname, "..", "frontend", "public");
app.use(express.static(publicDir));

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
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "");
      cb(null, `${Date.now()}-${name}${ext}`);
    },
  }),
});

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

const normalizeRole = (role) => (role === "provider" || role === "admin" ? role : "user");

const mapBookingStatusToDb = (status) => {
  const normalized = String(status || "").toLowerCase();
  const map = {
    pending: "pending",
    accepted: "accepted",
    rejected: "rejected",
    completed: "completed",
    confirmed: "accepted",
    cancelled: "rejected",
  };
  return map[normalized] || null;
};

const mapBookingStatusForFrontend = (status) => {
  const normalized = String(status || "").toLowerCase();
  const map = {
    pending: "pending",
    accepted: "confirmed",
    rejected: "cancelled",
    completed: "completed",
  };
  return map[normalized] || "pending";
};

const providerRowToFrontend = (row) => ({
  id: row.id,
  provider_id: row.id,
  name: row.providerName || row.name || "Provider",
  service_type: row.serviceTypes || "",
  experience_years: row.experience || 0,
  pricing: row.price ? `Starting at Rs.${row.price}` : "Contact for pricing",
  location: row.location || "",
  phone_number: row.phoneNumber || "",
  review_status: row.reviewStatus || "",
  description: row.description || "Experienced service provider.",
  profile_image: row.profileImage || null,
  portfolio_images: "[]",
});

const parsePricingToNumber = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const numeric = raw.replace(/[^\d]/g, "");
  return Number(numeric || 0);
};

app.get("/api/config", (_req, res) => {
  res.json({ googleClientId: googleClientId || null });
});

// -------------------------------
// API: Auth - Signup / Login
// -------------------------------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = normalizeRole(req.body.role);
    const googleId = req.body.googleId ? String(req.body.googleId).trim() : null;
    const serviceTypes = Array.isArray(req.body.serviceTypes) ? req.body.serviceTypes : [];

    if (!name || !email || !password) {
      res.status(400).json({ message: "name, email, and password are required." });
      return;
    }
    if (role === "provider" && serviceTypes.length === 0) {
      res.status(400).json({ message: "Please select at least one service type." });
      return;
    }

    const existing = await get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      res.status(409).json({ message: "Email already exists. Please login instead." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      "INSERT INTO users (name, email, password, password_hash, role, googleId) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, hashedPassword, role, googleId]
    );

    res.status(201).json({
      message: "Account created successfully.",
      user: { id: result.lastID, name, email, role, googleId, serviceType: serviceTypes.join(", ") || null },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Failed to create account." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const role = normalizeRole(req.body.role);
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await get(
      "SELECT id, name, email, role, password, password_hash FROM users WHERE email = ? AND role = ?",
      [email, role]
    );
    if (!user) {
      res.status(401).json({ message: "Invalid credentials for selected role." });
      return;
    }

    const hash = user.password_hash || user.password;
    const ok = await bcrypt.compare(password, hash || "");
    if (!ok) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const provider = role === "provider" ? await get("SELECT serviceTypes FROM providers WHERE userId = ?", [user.id]) : null;
    res.json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceType: provider?.serviceTypes || null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login." });
  }
});

app.post("/api/auth/admin/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required." });
      return;
    }

    const user = await get("SELECT id, name, email, role, password, password_hash FROM users WHERE email = ? AND role = 'admin'", [email]);
    if (!user) {
      res.status(401).json({ message: "Invalid admin credentials." });
      return;
    }
    const hash = user.password_hash || user.password;
    const ok = await bcrypt.compare(password, hash || "");
    if (!ok) {
      res.status(401).json({ message: "Invalid admin credentials." });
      return;
    }
    res.json({
      message: "Admin login successful.",
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Failed to login." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const role = normalizeRole(req.body.role);
    const serviceTypes = Array.isArray(req.body.serviceTypes) ? req.body.serviceTypes : [];
    if (!token) {
      res.status(400).json({ message: "Google token is required." });
      return;
    }
    if (!googleClient) {
      res.status(500).json({ message: "Google auth is not configured. Set GOOGLE_CLIENT_ID in your environment." });
      return;
    }

    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: googleClientId });
    const payload = ticket.getPayload();
    const email = String(payload?.email || "").trim().toLowerCase();
    const name = String(payload?.name || "User").trim();
    if (!email) {
      res.status(401).json({ message: "Invalid or expired token." });
      return;
    }

    let user = await get("SELECT id, name, email, role, googleId FROM users WHERE email = ?", [email]);
    if (!user) {
      if (role === "provider" && serviceTypes.length === 0) {
        res.status(400).json({ message: "Please select at least one service type for provider signup." });
        return;
      }
      const pw1 = await bcrypt.hash(`google-${Date.now()}`, 10);
      const pw2 = await bcrypt.hash(`google-${Date.now()}-h`, 10);
      const result = await run(
        "INSERT INTO users (name, email, password, password_hash, role, googleId) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, pw1, pw2, role, payload?.sub || null]
      );
      user = await get("SELECT id, name, email, role, googleId FROM users WHERE id = ?", [result.lastID]);
    }

    const provider = user.role === "provider" ? await get("SELECT serviceTypes FROM providers WHERE userId = ?", [user.id]) : null;
    res.json({
      message: "Google authentication successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        serviceType: provider?.serviceTypes || null,
        profilePicture: payload?.picture || null,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    const user = await get("SELECT id FROM users WHERE email = ?", [email]);
    // Return generic success even if user does not exist (security best practice)
    if (!user) {
      res.json({ message: "If this email exists, a reset link has been generated." });
      return;
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await run(
      "INSERT INTO password_resets (userId, token, expiresAt, used) VALUES (?, ?, ?, 0)",
      [user.id, token, expiresAt]
    );

    res.json({
      message: "Password reset link generated.",
      // For now return token directly; can be replaced with email service later.
      resetLink: `/reset-password.html?token=${token}`,
      token,
      expiresAt,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Failed to generate reset link." });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const token = String(req.body.token || "").trim();
    const newPassword = String(req.body.newPassword || "");
    if (!token || !newPassword) {
      res.status(400).json({ message: "Token and newPassword are required." });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters." });
      return;
    }

    const reset = await get(
      "SELECT id, userId, expiresAt, used FROM password_resets WHERE token = ?",
      [token]
    );
    if (!reset || reset.used) {
      res.status(400).json({ message: "Invalid or already used token." });
      return;
    }
    if (new Date(reset.expiresAt).getTime() < Date.now()) {
      res.status(400).json({ message: "Reset token has expired." });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await run("UPDATE users SET password = ?, password_hash = ? WHERE id = ?", [hash, hash, reset.userId]);
    await run("UPDATE password_resets SET used = 1 WHERE id = ?", [reset.id]);

    res.json({ message: "Password reset successful. Please login." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

// -------------------------------
// API: Provider Profile (upsert)
// -------------------------------
const saveProviderProfile = async (req, res) => {
  try {
    const userId = Number(req.body.userId || req.body.providerId);
    const serviceTypesInput = req.body.serviceTypes ?? req.body.serviceType;
    const serviceTypes = Array.isArray(serviceTypesInput)
      ? serviceTypesInput
      : typeof serviceTypesInput === "string"
      ? serviceTypesInput
      : "";
    const experience = Number(req.body.experience || 0);
    const price = parsePricingToNumber(req.body.price || req.body.pricing || 0);
    const location = String(req.body.location || "").trim();
    const phoneNumber = String(req.body.phoneNumber || req.body.phone_number || "").trim();
    const description = String(req.body.description || "").trim();
    const profileImageFile = req.files?.profileImage?.[0];
    const profileImage = profileImageFile ? `/uploads/${profileImageFile.filename}` : null;

    if (!userId || !serviceTypes || !location) {
      res.status(400).json({ message: "userId/serviceType, serviceTypes, and location are required." });
      return;
    }
    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      res.status(400).json({ message: "Please enter a valid 10-digit phone number." });
      return;
    }

    const user = await get("SELECT id, role FROM users WHERE id = ?", [userId]);
    if (!user || user.role !== "provider") {
      res.status(403).json({ message: "Only provider users can create profiles." });
      return;
    }

    const existing = await get("SELECT id, profileImage FROM providers WHERE userId = ?", [userId]);
    const normalizedServiceTypes = typeof serviceTypes === "string" ? serviceTypes : JSON.stringify(serviceTypes);
    if (existing) {
      await run(
        `UPDATE providers
         SET serviceTypes = ?, experience = ?, price = ?, location = ?, phoneNumber = ?, profileImage = COALESCE(?, profileImage), description = ?, approved = 1, reviewStatus = 'approved'
         WHERE userId = ?`,
        [normalizedServiceTypes, experience, price, location, phoneNumber, profileImage, description, userId]
      );
    } else {
      await run(
        `INSERT INTO providers (userId, serviceTypes, experience, price, location, phoneNumber, profileImage, approved, reviewStatus, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'approved', ?)`,
        [userId, normalizedServiceTypes, experience, price, location, phoneNumber, profileImage, description]
      );
    }

    const provider = await get("SELECT * FROM providers WHERE userId = ?", [userId]);
    res.json({ message: "Profile saved successfully.", provider });
  } catch (error) {
    console.error("Provider profile error:", error);
    res.status(500).json({ message: "Failed to save provider profile." });
  }
};

app.post(
  "/api/providers/profile",
  upload.fields([{ name: "profileImage", maxCount: 1 }, { name: "portfolioImages", maxCount: 8 }]),
  saveProviderProfile
);

// Legacy frontend route compatibility
app.post(
  "/api/provider/profile",
  upload.fields([{ name: "profileImage", maxCount: 1 }, { name: "portfolioImages", maxCount: 8 }]),
  saveProviderProfile
);

app.get("/api/provider/profile/:providerId", async (req, res) => {
  try {
    const userId = Number(req.params.providerId);
    const provider = await get("SELECT * FROM providers WHERE userId = ?", [userId]);
    if (!provider) {
      res.status(404).json({ message: "Profile not found." });
      return;
    }
    const user = await get("SELECT name FROM users WHERE id = ?", [userId]);
    res.json({
      profile: {
        providerId: provider.userId,
        name: user?.name || "",
        serviceType: provider.serviceTypes || "",
        experience: provider.experience || 0,
        pricing: provider.price ? `Starting at Rs.${provider.price}` : "",
        location: provider.location || "",
        phoneNumber: provider.phoneNumber || "",
        description: provider.description || "",
        profileImage: provider.profileImage || null,
        portfolioImages: [],
      },
    });
  } catch (error) {
    console.error("Provider profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile." });
  }
});

// -------------------------------
// API: Providers
// -------------------------------
app.get("/api/providers", async (_req, res) => {
  try {
    const providers = await all(
      `SELECT p.*, u.name AS providerName, u.email AS providerEmail
       FROM providers p
       JOIN users u ON u.id = p.userId
       WHERE TRIM(COALESCE(p.serviceTypes, '')) <> ''
       ORDER BY p.id DESC`
    );
    res.json(providers.map(providerRowToFrontend));
  } catch (error) {
    console.error("Fetch providers error:", error);
    res.status(500).json({ message: "Failed to fetch providers." });
  }
});

app.get("/api/providers/:id", async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    const provider = await get(
      `SELECT p.*, u.name AS providerName
       FROM providers p
       JOIN users u ON u.id = p.userId
       WHERE p.id = ?`,
      [providerId]
    );
    if (!provider) {
      res.status(404).json({ message: "Provider not found." });
      return;
    }
    res.json(providerRowToFrontend(provider));
  } catch (error) {
    console.error("Provider fetch error:", error);
    res.status(500).json({ message: "Failed to fetch provider." });
  }
});

// -------------------------------
// API: Bookings
// -------------------------------
app.post("/api/bookings", async (req, res) => {
  try {
    const userId = Number(req.body.userId || req.body.user_id);
    const providerId = Number(req.body.providerId || req.body.provider_id);
    const serviceType = String(req.body.serviceType || req.body.service_type || "").trim();
    const date = String(req.body.date || req.body.booking_date || "").trim();
    const time = String(req.body.time || req.body.booking_time || "").trim();
    const location = String(req.body.location || "").trim();
    const fullAddress = String(req.body.address || req.body.full_address || "").trim();
    const phoneNumber = String(req.body.phone_number || "").trim();
    const problemDescription = String(req.body.problem_description || "").trim();
    const address = fullAddress || location;

    if (!userId || !providerId || !serviceType || !date || !time || !address) {
      res.status(400).json({ message: "All required fields must be provided." });
      return;
    }

    const provider = await get("SELECT id, approved FROM providers WHERE id = ?", [providerId]);
    if (!provider) {
      res.status(404).json({ message: "Provider not found." });
      return;
    }
    if (!provider.approved) {
      res.status(400).json({ message: "Provider is not approved yet." });
      return;
    }

    const result = await run(
      `INSERT INTO bookings (userId, providerId, serviceType, date, time, address, status, user_id, provider_id, service_type, booking_date, booking_time, location, full_address, phone_number, problem_description)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, providerId, serviceType, date, time, address, userId, providerId, serviceType, date, time, location, fullAddress, phoneNumber, problemDescription]
    );

    res.status(201).json({
      message: "Booking created successfully.",
      booking: {
        id: result.lastID,
        user_id: userId,
        provider_id: providerId,
        service_type: serviceType,
        location,
        full_address: fullAddress,
        booking_date: date,
        booking_time: time,
        phone_number: phoneNumber,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "Failed to create booking." });
  }
});

app.get("/api/bookings/provider/:id", async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!providerId) {
      res.status(400).json({ message: "Invalid provider id." });
      return;
    }

    const bookings = await all(
      `SELECT b.*, u.name AS userName, u.email AS userEmail
       FROM bookings b
       JOIN users u ON u.id = b.userId
       WHERE b.providerId = ?
       ORDER BY b.id DESC`,
      [providerId]
    );
    res.json(
      bookings.map((b) => ({
        ...b,
        service_type: b.service_type || b.serviceType,
        booking_date: b.booking_date || b.date,
        booking_time: b.booking_time || b.time,
        full_address: b.full_address || b.address,
        status: mapBookingStatusForFrontend(b.status),
      }))
    );
  } catch (error) {
    console.error("Provider bookings error:", error);
    res.status(500).json({ message: "Failed to fetch provider bookings." });
  }
});

app.get("/api/bookings/user/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      res.status(400).json({ message: "Invalid user id." });
      return;
    }

    const bookings = await all(
      `SELECT b.*, p.serviceTypes, p.location AS providerLocation
       FROM bookings b
       LEFT JOIN providers p ON p.id = b.providerId
       WHERE b.userId = ?
       ORDER BY b.id DESC`,
      [userId]
    );
    res.json(
      bookings.map((b) => ({
        ...b,
        service_type: b.service_type || b.serviceType,
        booking_date: b.booking_date || b.date,
        booking_time: b.booking_time || b.time,
        full_address: b.full_address || b.address,
        status: mapBookingStatusForFrontend(b.status),
      }))
    );
  } catch (error) {
    console.error("User bookings error:", error);
    res.status(500).json({ message: "Failed to fetch user bookings." });
  }
});

app.patch("/api/bookings/:bookingId", async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const status = mapBookingStatusToDb(req.body.status);
    if (!bookingId || !status) {
      res.status(400).json({ message: "Invalid booking status." });
      return;
    }
    await run("UPDATE bookings SET status = ? WHERE id = ?", [status, bookingId]);
    res.json({ message: "Booking status updated successfully." });
  } catch (error) {
    console.error("Booking status update error:", error);
    res.status(500).json({ message: "Failed to update booking." });
  }
});

// -------------------------------
// API: Admin - Provider Approval
// -------------------------------
app.get("/api/admin/providers/pending", async (_req, res) => {
  try {
    const rows = await all(
      `SELECT p.*, u.name AS providerName, u.email AS providerEmail
       FROM providers p
       JOIN users u ON u.id = p.userId
       WHERE p.reviewStatus = 'pending'
       ORDER BY p.id DESC`
    );
    res.json(rows.map(providerRowToFrontend));
  } catch (error) {
    console.error("Pending providers error:", error);
    res.status(500).json({ message: "Failed to fetch pending providers." });
  }
});

app.get("/api/admin/providers", async (_req, res) => {
  try {
    const rows = await all(
      `SELECT p.*, u.name AS providerName, u.email AS providerEmail
       FROM providers p
       JOIN users u ON u.id = p.userId
       ORDER BY p.id DESC`
    );
    res.json(rows.map(providerRowToFrontend));
  } catch (error) {
    console.error("All providers error:", error);
    res.status(500).json({ message: "Failed to fetch providers." });
  }
});

app.patch("/api/admin/providers/:id/approve", async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!providerId) {
      res.status(400).json({ message: "Invalid provider id." });
      return;
    }
    await run("UPDATE providers SET approved = 1, reviewStatus = 'approved' WHERE id = ?", [providerId]);
    res.json({ message: "Provider approved successfully." });
  } catch (error) {
    console.error("Approve provider error:", error);
    res.status(500).json({ message: "Failed to approve provider." });
  }
});

app.patch("/api/admin/providers/:id/reject", async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!providerId) {
      res.status(400).json({ message: "Invalid provider id." });
      return;
    }
    await run("UPDATE providers SET approved = 0, reviewStatus = 'rejected' WHERE id = ?", [providerId]);
    res.json({ message: "Provider rejected successfully." });
  } catch (error) {
    console.error("Reject provider error:", error);
    res.status(500).json({ message: "Failed to reject provider." });
  }
});

app.delete("/api/admin/providers/:id", async (req, res) => {
  try {
    const providerId = Number(req.params.id);
    if (!providerId) {
      res.status(400).json({ message: "Invalid provider id." });
      return;
    }

    const provider = await get("SELECT id, userId FROM providers WHERE id = ?", [providerId]);
    if (!provider) {
      res.status(404).json({ message: "Provider not found." });
      return;
    }

    await run("DELETE FROM bookings WHERE providerId = ? OR provider_id = ?", [providerId, providerId]);
    await run("DELETE FROM providers WHERE id = ?", [providerId]);
    await run("UPDATE users SET role = 'user' WHERE id = ?", [provider.userId]);

    res.json({ message: "Provider profile deleted permanently." });
  } catch (error) {
    console.error("Delete provider error:", error);
    res.status(500).json({ message: "Failed to delete provider profile." });
  }
});

// Helpful routes for frontend pages
app.get("/auth", (_req, res) => res.sendFile(path.join(publicDir, "auth.html")));
app.get("/forgot-password", (_req, res) => res.sendFile(path.join(publicDir, "forgot-password.html")));
app.get("/reset-password", (_req, res) => res.sendFile(path.join(publicDir, "reset-password.html")));
app.get("/admin-login", (_req, res) => res.sendFile(path.join(publicDir, "admin-login.html")));
app.get("/admin-panel", (_req, res) => res.sendFile(path.join(publicDir, "admin-panel.html")));
app.get("/provider-dashboard", (_req, res) => res.sendFile(path.join(publicDir, "provider-dashboard.html")));
app.get("/provider-profile", (_req, res) => res.sendFile(path.join(publicDir, "provider-profile.html")));
app.get("/provider-bookings", (_req, res) => res.sendFile(path.join(publicDir, "provider-bookings.html")));
app.get("/user-bookings", (_req, res) => res.sendFile(path.join(publicDir, "user-bookings.html")));
app.get("/booking", (_req, res) => res.sendFile(path.join(publicDir, "booking.html")));

initializeDb()
  .then(async () => {
    // ensure at least one admin user exists
    const admin = await get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (!admin) {
      const hash = await bcrypt.hash("admin123", 10);
      await run(
        "INSERT INTO users (name, email, password, password_hash, role, googleId) VALUES (?, ?, ?, ?, 'admin', NULL)",
        ["FixMate Admin", "admin@fixmate.com", hash, hash]
      );
    }
    app.listen(PORT, () => {
      console.log(`FixMate server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("DB initialization failed:", error);
    process.exit(1);
  });

module.exports = { app, db };
