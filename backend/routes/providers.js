const express = require("express");
const User = require("../models/User");
const Provider = require("../models/Provider");

const router = express.Router();

const parsePricingToNumber = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const numeric = raw.replace(/[^\d]/g, "");
  return Number(numeric || 0);
};

const providerToFrontend = (provider, user) => ({
  id: provider._id,
  provider_id: provider._id,
  name: user?.name || "Provider",
  service_type: provider.serviceTypes ? provider.serviceTypes.join(", ") : "",
  experience_years: provider.experience || 0,
  pricing: provider.price ? `Starting at Rs.${provider.price}` : "Contact for pricing",
  location: provider.location || "",
  phone_number: provider.phoneNumber || "",
  review_status: provider.reviewStatus || "",
  description: provider.description || "Experienced service provider.",
  profile_image: provider.profileImage || null,
  portfolio_images: "[]",
});

// POST /api/providers/profile (Save/Update provider profile)
router.post("/profile", async (req, res) => {
  try {
    const { userId, serviceTypes, experience, price, location, phoneNumber, description, profileImage } = req.body;

    if (!userId || !serviceTypes || serviceTypes.length === 0 || !location) {
      return res.status(400).json({ message: "userId, serviceTypes, and location are required." });
    }

    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number." });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "provider") {
      return res.status(403).json({ message: "Only provider users can create profiles." });
    }

    let provider = await Provider.findOne({ userId });

    if (provider) {
      provider.serviceTypes = serviceTypes;
      provider.experience = experience || 0;
      provider.price = parsePricingToNumber(price);
      provider.location = location;
      provider.phoneNumber = phoneNumber || provider.phoneNumber;
      provider.profileImage = profileImage || provider.profileImage;
      provider.description = description || provider.description;
      provider.approved = true;
      provider.reviewStatus = "approved";
      await provider.save();
    } else {
      provider = new Provider({
        userId,
        serviceTypes,
        experience: experience || 0,
        price: parsePricingToNumber(price),
        location,
        phoneNumber: phoneNumber || "",
        profileImage: profileImage || null,
        description: description || "Experienced service provider.",
        approved: true,
        reviewStatus: "approved",
      });
      await provider.save();
    }

    res.json({ message: "Profile saved successfully.", provider });
  } catch (error) {
    console.error("Provider profile error:", error);
    res.status(500).json({ message: "Failed to save provider profile." });
  }
});

// GET /api/provider/profile/:providerId
router.get("/profile/:providerId", async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.providerId);
    if (!provider) {
      return res.status(404).json({ message: "Profile not found." });
    }

    const user = await User.findById(provider.userId);

    res.json({
      profile: {
        providerId: provider.userId,
        name: user?.name || "",
        serviceType: provider.serviceTypes ? provider.serviceTypes.join(", ") : "",
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

// GET /api/providers (Get all approved providers)
router.get("/", async (_req, res) => {
  try {
    const providers = await Provider.find({ approved: true, serviceTypes: { $exists: true, $ne: [] } })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    const result = providers.map((provider) => providerToFrontend(provider, provider.userId));
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

    res.json(providerToFrontend(provider, provider.userId));
  } catch (error) {
    console.error("Provider fetch error:", error);
    res.status(500).json({ message: "Failed to fetch provider." });
  }
});

module.exports = router;
