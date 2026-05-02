const express = require("express");
const User = require("../models/User");
const Provider = require("../models/Provider");
const authMiddleware = require("../middleware/auth");
const { providerToFrontend, buildImageUrl } = require("../utils/transformers");

const router = express.Router();

// Multer will be passed from server.js as middleware

const parsePricingToNumber = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const numeric = raw.replace(/[^\d]/g, "");
  return Number(numeric || 0);
};

// POST /api/providers/profile (Save/Update provider profile)
// Note: This route expects FormData with optional file uploads
router.post("/profile", authMiddleware, (req, res, next) => {
  // If there's a file, the upload middleware should be applied
  if (req.body.profileImage === "undefined" || req.body.profileImage === null) {
    delete req.body.profileImage;
  }
  next();
}, async (req, res) => {
  try {
    let { serviceTypes, experience, pricing, location, phoneNumber, description } = req.body;
    const userId = req.user.id;
    
    // Support both "pricing" and "price" field names
    const price = pricing || req.body.price;

    // Parse serviceTypes if it comes as string
    if (typeof serviceTypes === "string") {
      serviceTypes = serviceTypes.split(",").map(s => s.trim()).filter(s => s);
    }

    if (!serviceTypes || serviceTypes.length === 0 || !location) {
      return res.status(400).json({ message: "serviceTypes and location are required." });
    }

    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number." });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "provider") {
      return res.status(403).json({ message: "Only provider users can create profiles." });
    }

    // Build profile image URL if file was uploaded
    let profileImageUrl = null;
    if (req.files && req.files.profileImage) {
      profileImageUrl = `/uploads/${req.files.profileImage[0].filename}`;
    }

    // Build portfolio image URLs if files were uploaded
    let portfolioImageUrls = [];
    if (req.files && req.files.portfolioImages) {
      portfolioImageUrls = req.files.portfolioImages.map(file => `/uploads/${file.filename}`);
    }

    let provider = await Provider.findOne({ userId });

    if (provider) {
      provider.serviceTypes = serviceTypes;
      provider.experience = experience || 0;
      provider.price = parsePricingToNumber(price);
      provider.location = location;
      provider.phoneNumber = phoneNumber || provider.phoneNumber;
      if (profileImageUrl) {
        provider.profileImage = profileImageUrl;
      }
      // Add new portfolio images to existing ones
      if (portfolioImageUrls.length > 0) {
        provider.portfolioImages = [...(provider.portfolioImages || []), ...portfolioImageUrls];
      }
      provider.description = description || provider.description;
      // Do NOT auto-approve - must wait for admin review
      provider.reviewStatus = "pending";
      await provider.save();
    } else {
      provider = new Provider({
        userId,
        serviceTypes,
        experience: experience || 0,
        price: parsePricingToNumber(price),
        location,
        phoneNumber: phoneNumber || "",
        profileImage: profileImageUrl || null,
        portfolioImages: portfolioImageUrls,
        description: description || "Experienced service provider.",
        approved: false,
        reviewStatus: "pending",
      });
      await provider.save();
    }

    res.json({ message: "Profile saved successfully.", provider: {
      _id: provider._id,
      profileImage: provider.profileImage,
      ...provider.toObject()
    } });
  } catch (error) {
    console.error("Provider profile error:", error);
    res.status(500).json({ message: "Failed to save provider profile." });
  }
});

// GET /api/providers/profile/:userId - Get provider profile by USER ID
router.get("/profile/:userId", async (req, res) => {
  try {
    // First, find the provider by userId
    const provider = await Provider.findOne({ userId: req.params.userId });
    if (!provider) {
      return res.status(404).json({ message: "Profile not found." });
    }

    const user = await User.findById(req.params.userId);
    
    // Convert portfolio image paths to full URLs if needed
    const portfolioImages = (provider.portfolioImages || []).map(img => {
      if (img.startsWith("http")) return img;
      return img; // Already relative path, frontend will convert to full URL
    });

    res.json({
      profile: {
        providerId: provider._id,
        userId: provider.userId,
        name: user?.name || "",
        serviceType: provider.serviceTypes ? provider.serviceTypes.join(", ") : "",
        experience: provider.experience || 0,
        pricing: provider.price ? `Starting at Rs.${provider.price}` : "",
        location: provider.location || "",
        phoneNumber: provider.phoneNumber || "",
        description: provider.description || "",
        profileImage: provider.profileImage || null,
        portfolioImages: portfolioImages,
      },
    });
  } catch (error) {
    console.error("Provider profile fetch error:", error);
    res.status(500).json({ message: "Failed to fetch profile." });
  }
});

// GET /api/providers (Get all approved providers)
router.get("/", async (req, res) => {
  try {
    const providers = await Provider.find({ approved: true, serviceTypes: { $exists: true, $ne: [] } })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const result = providers.map((provider) => providerToFrontend(provider, provider.userId, req));
    res.json(result);
  } catch (error) {
    console.error("Fetch providers error:", error);
    res.status(500).json({ message: "Failed to fetch providers." });
  }
});

// GET /api/providers/:id (Get specific provider)
router.get("/:id", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id).populate("userId", "name email");

    if (!provider) {
      return res.status(404).json({ message: "Provider not found." });
    }

    res.json(providerToFrontend(provider, provider.userId, req));
  } catch (error) {
    console.error("Provider fetch error:", error);
    res.status(500).json({ message: "Failed to fetch provider." });
  }
});

module.exports = router;
